from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from app.auth import get_current_user
from app.database import get_session
from app.models import Deck, Flashcard, ReviewLog, User, UserSession
from app.routers.review import MASTERED_INTERVAL_DAYS
from app.schemas import UserStats

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _build_user_stats(user: User, session: Session) -> UserStats:
    # Card counts via deck ownership
    deck_ids = [
        d.id for d in session.exec(select(Deck).where(Deck.owner_id == user.id)).all()
    ]

    total_cards = 0
    new_cards = 0
    learning_cards = 0
    mastered_cards = 0

    if deck_ids:
        cards = session.exec(
            select(Flashcard).where(Flashcard.deck_id.in_(deck_ids))
        ).all()
        total_cards = len(cards)
        for c in cards:
            if c.repetitions == 0:
                new_cards += 1
            elif c.interval >= MASTERED_INTERVAL_DAYS:
                mastered_cards += 1
            else:
                learning_cards += 1

    # Review counts
    total_reviews = session.exec(
        select(func.count(ReviewLog.id)).where(ReviewLog.user_id == user.id)
    ).one()

    # Last review timestamp
    last_review: datetime | None = session.exec(
        select(func.max(ReviewLog.reviewed_at)).where(ReviewLog.user_id == user.id)
    ).one()

    # Total session time
    total_time = session.exec(
        select(func.sum(UserSession.duration_seconds)).where(
            UserSession.user_id == user.id,
            UserSession.duration_seconds.isnot(None),
        )
    ).one()

    return UserStats(
        user_id=user.id,
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at,
        total_cards=total_cards,
        new_cards=new_cards,
        learning_cards=learning_cards,
        mastered_cards=mastered_cards,
        total_reviews=total_reviews or 0,
        total_time_seconds=total_time or 0,
        last_active=last_review,
    )


@router.get("/users", response_model=List[UserStats])
def list_users_stats(
    admin: User = Depends(_require_admin),
    session: Session = Depends(get_session),
):
    users = session.exec(select(User).where(User.is_admin == False)).all()  # noqa: E712
    return [_build_user_stats(u, session) for u in users]


@router.get("/users/{user_id}", response_model=UserStats)
def get_user_stats(
    user_id: int,
    admin: User = Depends(_require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _build_user_stats(user, session)
