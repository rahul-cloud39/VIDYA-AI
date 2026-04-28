import json
import re
from base64 import b64decode

from google import genai
from google.genai import types

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


def generate_teacher_lesson(
    *,
    question: str,
    exam: str,
    language: str = "Hinglish",
    avatar_style: str = "friendly",
    image_data: str = "",
    image_mime_type: str = "image/png",
    model: str = "gemini-2.0-flash",
) -> str:
    system_instruction = (
        EXAM_SYSTEM_PROMPTS.get(exam, EXAM_SYSTEM_PROMPTS["JEE"])
        + "\nYou are VidyaAI's AI teacher. Explain like a human tutor on video. "
        "Return a short, emotionally engaging, step-by-step lesson that can be read out loud. "
        "Use the requested language, avatar style, and keep the answer structured."
    )
    prompt = f"""
Create a teacher-style video lesson for a student.
Exam: {exam}
Language: {language}
Avatar style: {avatar_style}
Student question: {question}

Return ONLY JSON with exactly these keys:
{{
  "title": "...",
  "concept_summary": "...",
  "short_answer": "...",
  "language": "{language}",
  "avatar_style": "{avatar_style}",
  "teaching_mood": "...",
  "steps": [
    {{"title": "Step 1", "explanation": "..."}},
    {{"title": "Step 2", "explanation": "..."}}
  ],
  "examples": ["..."],
  "common_mistakes": ["..."],
  "memory_hook": "...",
  "voiceover_script": "...",
  "video_scene_plan": ["..."],
  "next_practice": ["..."],
  "reminder_message": "...",
  "follow_up_question": "..."
}}

Rules:
- Make it feel like a real teacher explaining to one student.
- If the answer needs an assumption, say it clearly.
- Use Hinglish when language is Hinglish.
- Keep the output concise but high-value.
"""

    parts = [types.Part.from_text(text=prompt)]
    if image_data:
        try:
            decoded = b64decode(image_data)
            parts.append(types.Part.from_bytes(data=decoded, mime_type=image_mime_type or "image/png"))
        except Exception:
            pass

    response = _client().models.generate_content(
        model=model,
        contents=parts if len(parts) > 1 else prompt,
        config=types.GenerateContentConfig(system_instruction=[system_instruction]),
    )
    return response.text or ""


def teacher_lesson_fallback(
    *,
    question: str,
    exam: str,
    language: str = "Hinglish",
    avatar_style: str = "friendly",
    image_data: str = "",
) -> str:
    topic_hint = question.strip().split("?")[0].strip()[:80] or "the concept"
    lesson = {
        "title": f"{exam} Teacher Lesson: {topic_hint}",
        "concept_summary": "A quick teacher-style explanation built to keep the student moving even when the live model is unavailable.",
        "short_answer": "Start from the basics, identify the formula/rule, then apply it step by step.",
        "language": language,
        "avatar_style": avatar_style,
        "teaching_mood": "calm and clear",
        "steps": [
            {"title": "Step 1", "explanation": "Read the question carefully and underline what is being asked."},
            {"title": "Step 2", "explanation": "Recall the core rule or formula linked to this topic."},
            {"title": "Step 3", "explanation": "Apply it step by step and check units, signs, or wording."},
        ],
        "examples": [
            "Try a similar question with smaller numbers.",
            "Rephrase the concept in your own words and solve again.",
        ],
        "common_mistakes": [
            "Skipping the basic definition.",
            "Jumping directly to the final answer without units or logic.",
        ],
        "memory_hook": "Question -> rule -> steps -> answer.",
        "voiceover_script": "Let’s break this down like a teacher at the board. First, identify the idea, then connect it to the formula, and finally apply it carefully.",
        "video_scene_plan": [
            "Teacher intro with the topic name.",
            "Board-style explanation with steps appearing one by one.",
            "Quick recap and one practice prompt.",
        ],
        "next_practice": [
            "Solve one more similar problem.",
            "Explain the same concept to yourself in one minute.",
        ],
        "reminder_message": "Keep the streak alive. A short review today is better than a long reset tomorrow.",
        "follow_up_question": "Can you try solving one similar question without looking at the steps?",
    }
    if image_data:
        lesson["concept_summary"] += " The student also shared an image, so the explanation should reference what is visible in the screenshot."
    return json.dumps(lesson)


def parse_json_text(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", text, flags=re.S)
        if not match:
            raise
        return json.loads(match.group(1))
