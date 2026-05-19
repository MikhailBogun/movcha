from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.schemas import FlashcardResponse, ReviewResponse, ReviewSubmit
from app.services import card as card_service
from app.services import deck as deck_service
from app.services import review as review_service

router = APIRouter(prefix="/decks/{deck_id}/review", tags=["review"])


@router.get("/next", response_model=FlashcardResponse)
def get_next_card(
    deck_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck_service.get_owned_deck(deck_id, user, session)
    return review_service.get_next_card(deck_id, session)


@router.post("/{card_id}", response_model=ReviewResponse)
def submit_review(
    deck_id: int,
    card_id: int,
    body: ReviewSubmit,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = deck_service.get_owned_deck(deck_id, user, session)
    card = card_service.get_card(card_id, deck, session)
    card = review_service.submit_review(card, user.id, body.rating, session)
    return ReviewResponse(
        card=FlashcardResponse.model_validate(card),
        next_review=card.next_review,
        interval=card.interval,
    )
