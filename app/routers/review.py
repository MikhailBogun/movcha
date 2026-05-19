from __future__ import annotations

import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import Deck, Flashcard, ReviewLog, User
from app.schemas import FlashcardResponse, ReviewResponse, ReviewSubmit
from app.sm2 import MASTERED_INTERVAL_DAYS, apply_sm2

router = APIRouter(prefix="/decks/{deck_id}/review", tags=["review"])

# Probability that a mastered card is mixed into a due-cards session.
MASTERED_MIX_CHANCE = 0.15


def _get_owned_deck(deck_id: int, user: User, session: Session) -> Deck:
    deck = session.get(Deck, deck_id)
    if not deck or deck.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


def _mastered_cards(deck_id: int, session: Session) -> list[Flashcard]:
    return session.exec(
        select(Flashcard)
        .where(Flashcard.deck_id == deck_id)
        .where(Flashcard.interval >= MASTERED_INTERVAL_DAYS)
    ).all()


@router.get("/next", response_model=FlashcardResponse)
def get_next_card(
    deck_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _get_owned_deck(deck_id, user, session)
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


@router.post("/{card_id}", response_model=ReviewResponse)
def submit_review(
    deck_id: int,
    card_id: int,
    body: ReviewSubmit,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _get_owned_deck(deck_id, user, session)
    card = session.get(Flashcard, card_id)
    if not card or card.deck_id != deck_id:
        raise HTTPException(status_code=404, detail="Card not found")

    apply_sm2(card, body.rating)
    session.add(card)
    session.add(ReviewLog(user_id=user.id, card_id=card.id, rating=body.rating))
    session.commit()
    session.refresh(card)

    return ReviewResponse(
        card=FlashcardResponse.model_validate(card),
        next_review=card.next_review,
        interval=card.interval,
    )
