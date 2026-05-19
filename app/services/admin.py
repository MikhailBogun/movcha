from __future__ import annotations

from datetime import datetime

from sqlmodel import Session, func, select

from app.models import Deck, Flashcard, ReviewLog, User, UserSession
from app.schemas import UserStats
from app.services.sm2 import MASTERED_INTERVAL_DAYS


def list_non_admin_users(session: Session) -> list[User]:
    return session.exec(select(User).where(User.is_admin == False)).all()  # noqa: E712


def get_user_stats(user: User, session: Session) -> UserStats:
    deck_ids = [
        d.id for d in session.exec(select(Deck).where(Deck.owner_id == user.id)).all()
    ]

    total_cards = new_cards = learning_cards = mastered_cards = 0
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

    total_reviews: int = session.exec(
        select(func.count(ReviewLog.id)).where(ReviewLog.user_id == user.id)
    ).one()

    last_active: datetime | None = session.exec(
        select(func.max(ReviewLog.reviewed_at)).where(ReviewLog.user_id == user.id)
    ).one()

    total_time: int | None = session.exec(
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
        last_active=last_active,
    )
