from fastapi import Depends, Header, HTTPException
from jose import jwt, JWTError
from supabase import create_client, Client
from .config import Settings, get_settings
from .models import User


def get_supabase(settings: Settings = Depends(get_settings)) -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Supabase is not configured")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_at_hash": False},
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    user_id = payload.get("sub")
    email = payload.get("email", "")
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

