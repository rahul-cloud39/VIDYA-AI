from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from ..deps import get_current_user, get_supabase
from ..models import ReferralClaimRequest, User, UserProfileUpdate
from ..utils import day_ago_iso


router = APIRouter()


def _referral_code(user_id: str) -> str:
    return f"VIDYA-{user_id.replace('-', '')[:8].upper()}"


def _reward_until() -> str:
    return (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()


@router.get("/me")
async def get_me(user: User = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    quota = (
        supabase.table("doubt_sessions")
        .select("id", count="exact")
        .eq("user_id", user.id)
        .gte("created_at", day_ago_iso())
        .execute()
    )
    doubts_used = quota.count or 0
    doubts_limit = None if user.plan in {"pro", "avatar_pro"} else 5
    return {
        "user": user.model_dump(),
        "referral": {
            "code": _referral_code(user.id),
            "reward": "1 month Pro subscription free for every successful referral",
        },
        "quota": {
            "doubts_used": doubts_used,
            "doubts_limit": doubts_limit,
            "doubts_remaining": None if doubts_limit is None else max(doubts_limit - doubts_used, 0),
        },
    }


@router.patch("/me")
async def update_me(
    data: UserProfileUpdate,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    supabase.table("users").update({"exam": data.exam}).eq("id", user.id).execute()
    return {"ok": True, "exam": data.exam}


@router.post("/referrals/claim")
async def claim_referral(
    data: ReferralClaimRequest,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    code = data.code.strip().upper()
    if code == _referral_code(user.id):
        raise HTTPException(status_code=400, detail="You cannot use your own referral code.")

    users = supabase.table("users").select("id,email,plan").execute().data or []
    referrer = next((item for item in users if _referral_code(item["id"]) == code), None)
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code.")

    try:
        existing = (
            supabase.table("referrals")
            .select("id")
            .eq("referred_user_id", user.id)
            .maybe_single()
            .execute()
            .data
        )
        if existing:
            raise HTTPException(status_code=400, detail="Referral reward already claimed on this account.")
    except HTTPException:
        raise
    except Exception:
        existing = None

    reward_until = _reward_until()
    try:
        supabase.table("referrals").insert(
            {
                "referrer_user_id": referrer["id"],
                "referred_user_id": user.id,
                "referral_code": code,
                "reward_months": 1,
                "status": "rewarded",
            }
        ).execute()
    except Exception:
        pass

    try:
        supabase.table("users").update(
            {"plan": "pro", "pro_expires_at": reward_until}
        ).in_("id", [user.id, referrer["id"]]).execute()
    except Exception:
        supabase.table("users").update({"plan": "pro"}).in_("id", [user.id, referrer["id"]]).execute()

    return {
        "ok": True,
        "message": "Referral applied. You and your friend got 1 month Pro free.",
        "pro_expires_at": reward_until,
    }
