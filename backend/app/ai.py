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
    student_level: str = "beginner",
    image_data: str = "",
    image_mime_type: str = "image/png",
    model: str = "gemini-2.0-flash",
) -> str:
    level_rules = {
        "beginner": "Assume the student knows almost nothing. Define every term in plain language and use the simplest analogy first.",
        "intermediate": "Connect the concept to the core formula or rule quickly, then explain the reasoning and one exam-style trap.",
        "advanced": "Stay concise but still human. Focus on intuition, edge cases, and how the concept shows up in exams.",
    }
    level_rule = level_rules.get(student_level, level_rules["beginner"])
    system_instruction = (
        EXAM_SYSTEM_PROMPTS.get(exam, EXAM_SYSTEM_PROMPTS["JEE"])
        + "\nYou are VidyaAI's AI teacher. You are not a chatbot and not a textbook. "
        "You are a patient classroom teacher speaking to one confused student. "
        "Teach like a real human tutor using short spoken sentences, a board-style flow, and warm but precise language. "
        "Never jump straight to the final answer. Start with the intuition, then define the key idea, then solve step by step. "
        f"Student level rule: {level_rule} "
        "If the student question is vague, infer the most likely concept and say the assumption clearly. "
        "If the student shared an image, mention what is visible before solving. "
        "Keep the answer emotionally reassuring, practical, and easy to read aloud in a video."
    )
    prompt = f"""
Create a teacher-style video lesson for a student.
Exam: {exam}
Language: {language}
Avatar style: {avatar_style}
Student level: {student_level}
Student question: {question}

Return ONLY JSON with exactly these keys:
{{
  "title": "...",
  "concept_summary": "One-line big-picture explanation in a friendly teacher voice.",
  "why_it_matters": "Why this concept matters in exams or real understanding.",
  "ultra_simple_explanation": "The easiest possible explanation with zero jargon.",
  "analogy": "A simple everyday analogy that actually helps remember the idea.",
  "short_answer": "A clean answer the student can say out loud in class or in a mock test.",
  "language": "{language}",
  "avatar_style": "{avatar_style}",
  "student_level": "{student_level}",
  "teaching_mood": "A short mood label that matches the avatar style and student level.",
  "board_walkthrough": ["Bullet points for what the teacher would write on the board."],
  "steps": [
    {{"title": "Step 1", "explanation": "..."}},
    {{"title": "Step 2", "explanation": "..."}}
  ],
  "examples": ["At least one simple example and one exam-style example."],
  "common_mistakes": ["One or two mistakes students usually make."],
  "memory_hook": "A short mnemonic or remember-this line.",
  "teacher_tone": "How the teacher sounds: warm, strict, playful, etc.",
  "voiceover_script": "A natural spoken script that sounds like a teacher explaining live to a student.",
  "video_scene_plan": ["What appears in the video frame, step by step."],
  "next_practice": ["One quick follow-up practice idea."],
  "student_check": "A question the teacher asks to confirm understanding.",
  "reminder_message": "A short pressure/reminder line that pushes the student to revise.",
  "follow_up_question": "One follow-up question to continue the lesson."
}}

Rules:
- Make it feel like a real teacher explaining to one confused student sitting in class.
- Start from the simplest possible explanation and do not sound generic.
- If the student level is beginner, avoid jargon completely and define every concept in plain Hinglish.
- Speak like a live teacher, not like a blog post or dictionary.
- Use the selected language naturally. If Hinglish is selected, mix English terms with simple Hindi/Hinglish.
- Be specific. Mention the actual concept, the actual logic, and the actual exam trap when possible.
- If the question is image-based, point out what is visible before solving.
- Explain the same concept in a different way if needed until it clicks.
- If the answer needs an assumption, say it clearly.
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
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.4,
        ),
    )
    return response.text or ""


def teacher_lesson_fallback(
    *,
    question: str,
    exam: str,
    language: str = "Hinglish",
    avatar_style: str = "friendly",
    student_level: str = "beginner",
    image_data: str = "",
) -> str:
    topic_hint = question.strip().split("?")[0].strip()[:80] or "the concept"
    lesson = {
        "title": f"{exam} Teacher Lesson: {topic_hint}",
        "concept_summary": "A quick teacher-style explanation built to keep the student moving even when the live model is unavailable.",
        "why_it_matters": "Understanding the concept well helps the student solve similar questions faster in exams.",
        "ultra_simple_explanation": "Think of the topic in its simplest form and build up one step at a time.",
        "analogy": "Like learning to ride a bicycle: balance first, speed later.",
        "short_answer": "Start from the basics, identify the formula/rule, then apply it step by step.",
        "language": language,
        "avatar_style": avatar_style,
        "student_level": student_level,
        "teaching_mood": "calm and clear",
        "board_walkthrough": [
            "Write the topic name on the board.",
            "Show the core rule or formula.",
            "Work through the example slowly.",
        ],
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
        "teacher_tone": "patient, encouraging, and slightly firm about the method",
        "voiceover_script": "Let's break this down like a teacher at the board. First, identify the idea, then connect it to the formula, and finally apply it carefully.",
        "video_scene_plan": [
            "Teacher intro with the topic name.",
            "Board-style explanation with steps appearing one by one.",
            "Quick recap and one practice prompt.",
        ],
        "next_practice": [
            "Solve one more similar problem.",
            "Explain the same concept to yourself in one minute.",
        ],
        "student_check": "Can you say in one line what the question is really asking?",
        "reminder_message": "Keep the streak alive. A short review today is better than a long reset tomorrow.",
        "follow_up_question": "Can you try solving one similar question without looking at the steps?",
    }
    if image_data:
        lesson["concept_summary"] += " The student also shared an image, so the explanation should reference what is visible in the screenshot."
    return json.dumps(lesson)


def question_fallback(
    *,
    exam: str,
    subject: str,
    topic: str,
    difficulty: str = "medium",
) -> str:
    topic_label = topic.strip()[:80] or "the selected topic"
    subject_label = subject.strip()[:60] or "General"
    question = {
        "question": (
            f"In {subject_label}, which option best describes the core idea behind {topic_label}?"
        ),
        "options": [
            "Identify the concept, choose the matching rule, and apply it step by step.",
            "Memorize the final answer without checking the question data.",
            "Ignore units, signs, and keywords because they rarely matter.",
            "Use any formula from the chapter even if the variables do not match.",
        ],
        "answer_index": 0,
        "explanation": (
            "The safest exam method is to first identify what the question is testing, then choose the correct rule "
            "or formula, and finally apply it carefully. This fallback question appears when the live AI model is "
            "temporarily unavailable."
        ),
        "topic": topic_label,
        "difficulty": difficulty,
    }
    return json.dumps(question)


def parse_json_text(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", text, flags=re.S)
        if not match:
            raise
        return json.loads(match.group(1))
