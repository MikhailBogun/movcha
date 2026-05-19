from datetime import datetime, timezone
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
    __tablename__: str = "users"

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    email: str = Field(unique=True, index=True, nullable=False, max_length=100)
    hashed_password: str = Field(nullable=False, max_length=255)
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    decks: List["Deck"] = Relationship(
        back_populates="owner",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    sessions: List["UserSession"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Deck(SQLModel, table=True):
    __tablename__: str = "decks"

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    name: str = Field(index=True, nullable=False, max_length=50)
    description: Optional[str] = Field(default=None, max_length=200)

    owner_id: int = Field(foreign_key="users.id")

    owner: User = Relationship(back_populates="decks")
    cards: List["Flashcard"] = Relationship(
        back_populates="deck",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Flashcard(SQLModel, table=True):
    __tablename__: str = "flashcards"

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    deck_id: int = Field(foreign_key="decks.id")

    front_text: str = Field(nullable=False)
    back_text: str = Field(nullable=False)

    next_review: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    easiness_factor: float = Field(default=2.5)
    interval: int = Field(default=0)
    repetitions: int = Field(default=0)

    deck: Deck = Relationship(back_populates="cards")
    review_logs: List["ReviewLog"] = Relationship(
        back_populates="card",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class ReviewLog(SQLModel, table=True):
    __tablename__: str = "review_logs"

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    card_id: int = Field(foreign_key="flashcards.id", index=True)
    rating: int
    reviewed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    card: Flashcard = Relationship(back_populates="review_logs")


class UserSession(SQLModel, table=True):
    __tablename__: str = "user_sessions"

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_ping_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = Field(default=None)
    duration_seconds: Optional[int] = Field(default=None)

    user: User = Relationship(back_populates="sessions")
