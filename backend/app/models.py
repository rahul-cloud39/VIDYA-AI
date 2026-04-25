from datetime import date
from typing import Literal
from pydantic import BaseModel, Field


Exam = Literal["JEE", "NEET", "UPSC"]


class User(BaseModel):
    id: str
    email: str
    plan: Literal["free", "pro"] = "free"
    exam: Exam = "JEE"


class DoubtRequest(BaseModel):
    question: str = Field(min_length=5, max_length=3000)
    exam: Exam = "JEE"


class QuestionRequest(BaseModel):
    exam: Exam
    subject: str
    topic: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class AttemptRequest(BaseModel):
    exam: Exam
    subject: str
    topic: str
    correct: bool
    time_taken: int = 0
    difficulty: str = "medium"


class PlanRequest(BaseModel):
    exam: Exam
    exam_date: date
    weak_topics: list[str]
    hours_per_day: int = Field(ge=1, le=16)


class FlashcardRequest(BaseModel):
    exam: Exam
    subject: str
    topic: str
    chapter_text: str = Field(default="", max_length=20000)


class EvalRequest(BaseModel):
    question: str
    answer: str


class UserProfileUpdate(BaseModel):
    exam: Exam
