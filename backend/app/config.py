from functools import lru_cache
from pydantic import Field
from pydantic import field_validator
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    gemini_api_key: str = Field("", validation_alias="GEMINI_API_KEY")
    supabase_url: str = Field("", validation_alias="SUPABASE_URL")
    supabase_service_role_key: str = Field("", validation_alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str = Field("", validation_alias="SUPABASE_JWT_SECRET")
    razorpay_key_id: str = Field("", validation_alias="RAZORPAY_KEY_ID")
    razorpay_key_secret: str = Field("", validation_alias="RAZORPAY_KEY_SECRET")
    razorpay_webhook_secret: str = Field("", validation_alias="RAZORPAY_WEBHOOK_SECRET")
    frontend_url: str = Field("http://localhost:5173", validation_alias="FRONTEND_URL")

    @field_validator(
        "gemini_api_key",
        "supabase_url",
        "supabase_service_role_key",
        "supabase_jwt_secret",
        "razorpay_key_id",
        "razorpay_key_secret",
        "razorpay_webhook_secret",
        "frontend_url",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
