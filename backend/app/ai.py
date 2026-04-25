import json
import re

from google import genai

from .config import get_settings


EXAM_SYSTEM_PROMPTS = {
    "JEE": "You are VidyaAI, a JEE expert tutor. Explain Physics, Chemistry, and Maths clearly. Use simple Hinglish when useful. Keep answers under 200 words.",
    "NEET": "You are VidyaAI, a NEET expert tutor. Explain Biology, Physics, and Chemistry using NCERT-aligned language and mnemonics. Keep answers under 200 words.",
    "UPSC": "You are VidyaAI, a UPSC expert tutor. Structure answers with intro, body, and conclusion. Connect to current affairs when useful. Keep answers under 250 words.",
}


def _client() -> genai.Client:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=settings.gemini_api_key)


def generate_response(prompt: str, model: str = "gemini-2.0-flash") -> str:
    response = _client().models.generate_content(
        model=model,
        contents=prompt,
    )
    return response.text or ""


def parse_json_text(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", text, flags=re.S)
        if not match:
            raise
        return json.loads(match.group(1))
