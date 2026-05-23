from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

# --- Auth ---


class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Password must be 72 characters or fewer")
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Decks ---


class DeckCreate(BaseModel):
    name: str
    description: str | None = None


class DeckUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class DeckResponse(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int

    model_config = {"from_attributes": True}


# --- Flashcards ---


class FlashcardCreate(BaseModel):
    front_text: str
    back_text: str


class FlashcardUpdate(BaseModel):
    front_text: str | None = None
    back_text: str | None = None


class FlashcardResponse(BaseModel):
    id: int
    deck_id: int
    front_text: str
    back_text: str
    next_review: datetime
    easiness_factor: float
    interval: int
    repetitions: int

    model_config = {"from_attributes": True}


# --- Review ---


class ReviewSubmit(BaseModel):
    rating: int  # 0–5 (SM-2 scale)


class ReviewResponse(BaseModel):
    card: FlashcardResponse
    next_review: datetime
    interval: int


# --- Sessions ---


class SessionResponse(BaseModel):
    id: int
    user_id: int
    started_at: datetime
    last_ping_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None

    model_config = {"from_attributes": True}


# --- Dictionary ---


class DefinitionSchema(BaseModel):
    part_of_speech: str
    definition: str
    example: str | None = None


class DictionaryResultSchema(BaseModel):
    word: str
    cefr: str | None
    definitions: list[DefinitionSchema]
    examples: list[str]
    phrasal_verbs: list[str]
    translations: list[str]
    translation_source: str


# --- Admin ---


class UserStats(BaseModel):
    user_id: int
    email: str
    is_active: bool
    created_at: datetime
    total_cards: int
    new_cards: int  # never reviewed
    learning_cards: int  # reviewed, interval < 21 days
    mastered_cards: int  # interval >= 21 days
    total_reviews: int
    total_time_seconds: int
    last_active: datetime | None
