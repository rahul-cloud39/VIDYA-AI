import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import get_settings


router = APIRouter()

HEYGEN_GENERATE_URL = "https://api.heygen.com/v2/video/generate"
HEYGEN_STATUS_URL = "https://api.heygen.com/v1/video_status.get"

DEFAULT_AVATAR_ID = "Daisy-inskirt-20220818"
DEFAULT_VOICE_ID = "2d5b0e6cf36f460aa7fc47e3eee4ba54"


class HeyGenGenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1500)
    avatar_id: str | None = None
    voice_id: str | None = None
    background_color: str = "#0f5f4c"


def _heygen_api_key() -> str:
    settings = get_settings()
    key = (
        os.getenv("HEYGEN_API_KEY")
        or getattr(settings, "heygen_api_key", "")
        or ""
    ).strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="HEYGEN_API_KEY is not configured on the backend.",
        )
    return key


@router.post("/avatar/heygen")
async def heygen_generate(payload: HeyGenGenerateRequest):
    api_key = _heygen_api_key()
    avatar_id = (payload.avatar_id or os.getenv("HEYGEN_AVATAR_ID") or DEFAULT_AVATAR_ID).strip()
    voice_id = (payload.voice_id or os.getenv("HEYGEN_VOICE_ID") or DEFAULT_VOICE_ID).strip()

    body = {
        "video_inputs": [
            {
                "character": {
                    "type": "avatar",
                    "avatar_id": avatar_id,
                    "avatar_style": "normal",
                },
                "voice": {
                    "type": "text",
                    "input_text": payload.text,
                    "voice_id": voice_id,
                },
                "background": {
                    "type": "color",
                    "value": payload.background_color,
                },
            }
        ],
        "dimension": {"width": 1280, "height": 720},
    }

    headers = {"X-Api-Key": api_key, "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(HEYGEN_GENERATE_URL, headers=headers, json=body)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"HeyGen request failed: {exc}") from exc

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    data = response.json() or {}
    inner = data.get("data") or {}
    video_id = inner.get("video_id")
    if not video_id:
        raise HTTPException(status_code=502, detail=f"HeyGen response missing video_id: {data}")

    return {"video_id": video_id, "status": "processing"}


@router.get("/avatar/heygen/status")
async def heygen_status(video_id: str):
    api_key = _heygen_api_key()
    headers = {"X-Api-Key": api_key}

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                HEYGEN_STATUS_URL,
                headers=headers,
                params={"video_id": video_id},
            )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"HeyGen status failed: {exc}") from exc

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    payload = response.json() or {}
    inner = payload.get("data") or {}
    return {
        "video_id": video_id,
        "status": inner.get("status"),
        "video_url": inner.get("video_url"),
        "thumbnail_url": inner.get("thumbnail_url"),
        "error": inner.get("error"),
    }
