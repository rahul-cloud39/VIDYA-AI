from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = Field("", alias="GEMINI_API_KEY")
    supabase_url: str = Field("", alias="SUPABASE_URL")
    supabase_service_role_key: str = Field("", alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str = Field("", alias="SUPABASE_JWT_SECRET")
    razorpay_key_id: str = Field("", alias="RAZORPAY_KEY_ID")
    razorpay_key_secret: str = Field("", alias="RAZORPAY_KEY_SECRET")
    razorpay_webhook_secret: str = Field("", alias="RAZORPAY_WEBHOOK_SECRET")
    frontend_url: str = Field("http://localhost:5173", alias="FRONTEND_URL")

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
