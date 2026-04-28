import os
from fastapi import Depends, Header, HTTPException
from supabase import create_client, Client
from .config import Settings, get_settings
from .models import User


def get_supabase(settings: Settings = Depends(get_settings)) -> Client:
    supabase_url = (os.getenv("SUPABASE_URL") or settings.supabase_url or "").strip()
    service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or settings.supabase_service_role_key or "").strip()
    if not supabase_url or not service_role_key:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Supabase is not configured",
                "missing": {
                    "SUPABASE_URL": not bool(supabase_url),
                    "SUPABASE_SERVICE_ROLE_KEY": not bool(service_role_key),
                },
            },
        )
    return create_client(supabase_url, service_role_key)


async def get_current_user(
    authorization: str | None = Header(default=None),
    supabase: Client = Depends(get_supabase),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        user_response = supabase.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    auth_user = getattr(user_response, "user", None)
    user_id = getattr(auth_user, "id", None)
    email = getattr(auth_user, "email", "") or ""
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
    row = result.data
    if not row:
        row = {
            "id": user_id,
            "email": email,
            "plan": "free",
            "exam": "JEE",
        }
        supabase.table("users").insert(row).execute()

    return User(**row)


async def get_pro_user(user: User = Depends(get_current_user)) -> User:
    if user.plan != "pro":
        raise HTTPException(status_code=402, detail="Pro plan required")
    return user
