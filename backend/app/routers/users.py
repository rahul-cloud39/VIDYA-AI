from fastapi import APIRouter, Depends
from supabase import Client
from ..deps import get_current_user, get_supabase
from ..models import User, UserProfileUpdate
from ..utils import day_ago_iso


router = APIRouter()


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
    doubts_limit = None if user.plan == "pro" else 5
    return {
        "user": user.model_dump(),
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
