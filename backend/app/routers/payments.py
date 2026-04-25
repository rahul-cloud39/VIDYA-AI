import hashlib
import hmac
import razorpay
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from supabase import Client
from ..config import Settings, get_settings
from ..deps import get_current_user, get_supabase
from ..models import User


router = APIRouter()


@router.post("/create-order")
async def create_order(
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase),
):
    client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
    order = client.order.create({"amount": 19900, "currency": "INR", "payment_capture": 1})
    supabase.table("subscriptions").insert(
        {
            "user_id": user.id,
            "plan": "pro",
            "amount": 19900,
            "razorpay_order_id": order["id"],
            "status": "pending",
        }
    ).execute()
    return {"order": order, "key_id": settings.razorpay_key_id}


@router.post("/verify-payment")
async def verify_payment(
    payload: dict,
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase),
):
    order_id = payload.get("razorpay_order_id", "")
    payment_id = payload.get("razorpay_payment_id", "")
    signature = payload.get("razorpay_signature", "")
    message = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(settings.razorpay_key_secret.encode(), message, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    supabase.table("subscriptions").update(
        {"status": "paid", "razorpay_payment_id": payment_id}
    ).eq("razorpay_order_id", order_id).eq("user_id", user.id).execute()
    supabase.table("users").update({"plan": "pro"}).eq("id", user.id).execute()
    return {"ok": True}


@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase),
):
    body = await request.body()
    expected = hmac.new(
        settings.razorpay_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not x_razorpay_signature or not hmac.compare_digest(expected, x_razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json()
    if payload.get("event") == "payment.captured":
        payment = payload["payload"]["payment"]["entity"]
        order_id = payment.get("order_id")
        sub = (
            supabase.table("subscriptions")
            .select("user_id")
            .eq("razorpay_order_id", order_id)
            .maybe_single()
            .execute()
            .data
        )
        if sub:
            supabase.table("subscriptions").update(
                {"status": "paid", "razorpay_payment_id": payment.get("id")}
            ).eq("razorpay_order_id", order_id).execute()
            supabase.table("users").update({"plan": "pro"}).eq("id", sub["user_id"]).execute()
    return {"ok": True}
