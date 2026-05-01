import json
import random
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..ai import generate_response, parse_json_text


router = APIRouter()

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "pyqs.json"

DIFFICULTIES = ("easy", "medium", "hard")


class PYQTestRequest(BaseModel):
    exam: str = Field(..., min_length=1, max_length=40)
    chapter: str = Field(..., min_length=1, max_length=80)
    difficulty: str = Field("mixed", max_length=12)
    year_from: int | None = None
    year_to: int | None = None
    count: int = Field(10, ge=1, le=30)


def _load_dataset() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    try:
        with DATA_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError):
        return []
    return data if isinstance(data, list) else []


def _normalize(value: str) -> str:
    return (value or "").strip().lower()


def _matches(item: dict, exam: str, chapter: str, difficulty: str,
             year_from: int, year_to: int) -> bool:
    if _normalize(item.get("exam")) != _normalize(exam):
        return False
    if _normalize(chapter) not in _normalize(item.get("chapter")):
        return False
    if difficulty != "mixed" and _normalize(item.get("difficulty")) != _normalize(difficulty):
        return False
    year = item.get("year")
    if not isinstance(year, int):
        return False
    if year < year_from or year > year_to:
        return False
    return True


def _generate_with_ai(exam: str, chapter: str, difficulty: str,
                     year_from: int, year_to: int, count: int) -> list[dict]:
    if count <= 0:
        return []

    diff_clause = (
        "Mix easy, medium and hard difficulty."
        if difficulty == "mixed"
        else f"All questions must be {difficulty} difficulty."
    )

    prompt = f"""
You are an exam expert. Produce {count} multiple-choice previous-year-style questions
for the {exam} exam on the chapter "{chapter}".
{diff_clause}
Each question must reference a plausible exam year in the inclusive range {year_from} to {year_to}.
Return ONLY a JSON array. Each element must have EXACTLY these fields:
[
  {{
    "year": 2018,
    "chapter": "{chapter}",
    "difficulty": "easy|medium|hard",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer_index": 0,
    "explanation": "..."
  }}
]
No markdown, no extra commentary.
"""

    try:
        raw = generate_response(prompt)
        parsed = parse_json_text(raw)
    except Exception:
        return []

    if not isinstance(parsed, list):
        return []

    cleaned: list[dict] = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        options = item.get("options")
        if not isinstance(options, list) or len(options) < 2:
            continue

        try:
            answer_index = int(item.get("answer_index", 0))
        except (TypeError, ValueError):
            answer_index = 0
        if answer_index < 0 or answer_index >= len(options):
            answer_index = 0

        try:
            year = int(item.get("year") or year_to)
        except (TypeError, ValueError):
            year = year_to
        year = max(year_from, min(year_to, year))

        raw_difficulty = _normalize(item.get("difficulty"))
        if raw_difficulty not in DIFFICULTIES:
            raw_difficulty = "medium" if difficulty == "mixed" else difficulty

        cleaned.append({
            "id": f"ai-{uuid.uuid4().hex[:10]}",
            "exam": exam,
            "year": year,
            "chapter": item.get("chapter") or chapter,
            "difficulty": raw_difficulty,
            "question": str(item.get("question") or "").strip(),
            "options": [str(opt) for opt in options[:4]],
            "answer_index": answer_index,
            "explanation": str(item.get("explanation") or "").strip(),
            "source": "ai",
        })

    return [q for q in cleaned if q["question"]][:count]


@router.post("/pyq/test")
async def pyq_test(data: PYQTestRequest):
    difficulty = _normalize(data.difficulty) or "mixed"
    if difficulty not in {"mixed", *DIFFICULTIES}:
        raise HTTPException(status_code=400, detail="Invalid difficulty")

    current_year = datetime.utcnow().year
    year_to = data.year_to or current_year
    year_from = data.year_from or (year_to - 14)
    if year_from > year_to:
        year_from, year_to = year_to, year_from

    dataset = _load_dataset()
    matches = [q for q in dataset if _matches(q, data.exam, data.chapter, difficulty,
                                              year_from, year_to)]
    random.shuffle(matches)
    manual_selected = matches[: data.count]

    ai_needed = data.count - len(manual_selected)
    ai_generated = _generate_with_ai(
        exam=data.exam,
        chapter=data.chapter,
        difficulty=difficulty,
        year_from=year_from,
        year_to=year_to,
        count=ai_needed,
    )

    questions = manual_selected + ai_generated
    random.shuffle(questions)

    return {
        "exam": data.exam,
        "chapter": data.chapter,
        "difficulty": difficulty,
        "year_from": year_from,
        "year_to": year_to,
        "count_requested": data.count,
        "count_returned": len(questions),
        "manual_count": len(manual_selected),
        "ai_count": len(ai_generated),
        "questions": questions,
    }


@router.get("/pyq/chapters")
async def pyq_chapters(exam: str):
    dataset = _load_dataset()
    chapters: dict[str, dict] = {}
    for item in dataset:
        if _normalize(item.get("exam")) != _normalize(exam):
            continue
        chapter = (item.get("chapter") or "").strip()
        if not chapter:
            continue
        bucket = chapters.setdefault(chapter, {"chapter": chapter, "count": 0, "years": set()})
        bucket["count"] += 1
        year = item.get("year")
        if isinstance(year, int):
            bucket["years"].add(year)

    result = []
    for chapter, bucket in chapters.items():
        years = sorted(bucket["years"])
        result.append({
            "chapter": chapter,
            "count": bucket["count"],
            "year_from": years[0] if years else None,
            "year_to": years[-1] if years else None,
        })
    result.sort(key=lambda row: row["chapter"].lower())
    return {"exam": exam, "chapters": result}
