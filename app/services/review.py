from __future__ import annotations

import random
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Flashcard, ReviewLog
from app.services.sm2 import MASTERED_INTERVAL_DAYS, apply_sm2

MASTERED_MIX_CHANCE = 0.15


def _mastered_cards(deck_id: int, session: Session) -> list[Flashcard]:
    return session.exec(
        select(Flashcard)
        .where(Flashcard.deck_id == deck_id)
        .where(Flashcard.interval >= MASTERED_INTERVAL_DAYS)
    ).all()


def get_next_card(deck_id: int, session: Session) -> Flashcard:
    now = datetime.now(timezone.utc)

    due_card = session.exec(
        select(Flashcard)
        .where(Flashcard.deck_id == deck_id)
        .where(Flashcard.interval < MASTERED_INTERVAL_DAYS)
        .where(Flashcard.next_review <= now)
        .order_by(Flashcard.next_review)
    ).first()

    # Occasionally mix in a mastered card to keep them fresh.
    if due_card and random.random() < MASTERED_MIX_CHANCE:
        mastered = _mastered_cards(deck_id, session)
        if mastered:
            return random.choice(mastered)

    if due_card:
        return due_card

    # No due learning cards — serve a mastered card as a refresher.
    mastered = _mastered_cards(deck_id, session)
    if mastered:
        return random.choice(mastered)

    raise HTTPException(status_code=404, detail="No cards due for review")


def submit_review(
    card: Flashcard, user_id: int, rating: int, session: Session
) -> Flashcard:
    apply_sm2(card, rating)
    session.add(card)
    session.add(ReviewLog(user_id=user_id, card_id=card.id, rating=rating))
    session.commit()
    session.refresh(card)
    return card
