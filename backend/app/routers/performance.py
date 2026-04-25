from fastapi import APIRouter, Depends
from supabase import Client
from ..deps import get_current_user, get_supabase
from ..models import AttemptRequest, User


router = APIRouter()


@router.post("/attempts")
async def save_attempt(
    data: AttemptRequest,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    row = data.model_dump()
    row["user_id"] = user.id
    supabase.table("attempts").insert(row).execute()
    return {"ok": True}


@router.get("/performance")
async def performance(user: User = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    weak = supabase.rpc("get_weak_topics", {"uid": user.id}).execute().data or []
    recent = (
        supabase.table("attempts")
        .select("exam,subject,topic,correct,difficulty,created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
        .data
        or []
    )
    total = len(recent)
    accuracy = round(sum(1 for item in recent if item.get("correct")) / total, 2) if total else 0
    return {"weak_topics": weak, "recent": recent, "accuracy": accuracy}

