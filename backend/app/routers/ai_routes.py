from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from supabase import Client

from ..ai import (
    EXAM_SYSTEM_PROMPTS,
    generate_response,
    generate_teacher_lesson,
    parse_json_text,
    teacher_lesson_fallback,
)
from ..deps import get_current_user, get_optional_user, get_pro_user, get_supabase
from ..models import (
    DoubtRequest,
    EvalRequest,
    FlashcardRequest,
    PlanRequest,
    QuestionRequest,
    TeacherRequest,
    User,
)
from ..utils import day_ago_iso


router = APIRouter()


async def check_daily_quota(user: User, supabase: Client):
    if user.plan == "pro":
        return
    result = (
        supabase.table("doubt_sessions")
        .select("id", count="exact")
        .eq("user_id", user.id)
        .gte("created_at", day_ago_iso())
        .execute()
    )
    if (result.count or 0) >= 5:
        raise HTTPException(status_code=402, detail="Daily free doubt limit reached")


@router.post("/doubt/stream")
async def stream_doubt(
    data: DoubtRequest,
    user: User | None = Depends(get_optional_user),
    supabase: Client = Depends(get_supabase),
):
    if user:
        await check_daily_quota(user, supabase)
    system = EXAM_SYSTEM_PROMPTS.get(data.exam, EXAM_SYSTEM_PROMPTS["JEE"])

    def generate():
        full_prompt = f"{system}\n\nStudent question: {data.question}\n\nAnswer:"
        answer = generate_response(full_prompt)
        yield answer.encode("utf-8")

        if user:
            supabase.table("doubt_sessions").insert(
                {
                    "user_id": user.id,
                    "question": data.question,
                    "answer": answer,
                    "exam": data.exam,
                }
            ).execute()

    return StreamingResponse(generate(), media_type="text/plain")


@router.post("/teacher/explain")
async def teacher_explain(
    data: TeacherRequest,
    user: User | None = Depends(get_optional_user),
):
    try:
        response = generate_teacher_lesson(
            question=data.question,
            exam=data.exam,
            language=data.language,
            avatar_style=data.avatar_style,
            student_level=data.student_level,
            image_data=data.image_data,
            image_mime_type=data.image_mime_type,
        )
        return parse_json_text(response)
    except Exception:
        return parse_json_text(
            teacher_lesson_fallback(
                question=data.question,
                exam=data.exam,
                language=data.language,
                avatar_style=data.avatar_style,
                student_level=data.student_level,
                image_data=data.image_data,
            )
        )


@router.post("/generate-question")
async def generate_question(data: QuestionRequest, user: User | None = Depends(get_optional_user)):
    prompt = f"""
Create one {data.exam} MCQ for subject {data.subject}, topic {data.topic}, difficulty {data.difficulty}.
Return ONLY JSON:
{{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "answer_index": 0,
  "explanation": "...",
  "topic": "{data.topic}",
  "difficulty": "{data.difficulty}"
}}
"""
    response = generate_response(prompt)
    return parse_json_text(response)


@router.post("/study-plan")
async def create_study_plan(data: PlanRequest, user: User = Depends(get_pro_user)):
    prompt = f"""
Create a day-by-day study plan for {data.exam}.
Exam date: {data.exam_date}
Weak topics: {", ".join(data.weak_topics)}
Available hours per day: {data.hours_per_day}
Return ONLY a JSON array with objects:
[{{"date":"YYYY-MM-DD","topics":["topic"],"tasks":["task"],"revision":false}}]
"""
    response = generate_response(prompt)
    return {"plan": parse_json_text(response)}


@router.post("/flashcards")
async def generate_flashcards(
    data: FlashcardRequest,
    user: User = Depends(get_pro_user),
    supabase: Client = Depends(get_supabase),
):
    prompt = f"""
Create 20 flashcards for {data.exam}, subject {data.subject}, topic {data.topic}.
Use this chapter text if provided: {data.chapter_text[:8000]}
Return ONLY a JSON array:
[{{"front":"...","back":"...","difficulty":"medium","exam_relevance":"..."}}]
"""
    response = generate_response(prompt)
    cards = parse_json_text(response)
    for card in cards:
        card["user_id"] = user.id
    supabase.table("flashcards").insert(cards).execute()
    return {"cards": cards, "count": len(cards)}


@router.post("/answer-eval")
async def evaluate_answer(data: EvalRequest, user: User = Depends(get_pro_user)):
    prompt = f"""
You are a UPSC examiner. Evaluate this answer.
Question: {data.question}
Student answer: {data.answer}
Return ONLY JSON:
{{
  "score": 7,
  "max_score": 10,
  "feedback": {{
    "content": "...",
    "structure": "...",
    "keywords": ["mentioned or missing keyword"],
    "improvements": ["..."]
  }},
  "model_answer_hints": "..."
}}
"""
    response = generate_response(prompt)
    return parse_json_text(response)
