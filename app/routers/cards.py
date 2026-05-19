from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.schemas import FlashcardCreate, FlashcardResponse, FlashcardUpdate
from app.services import card as card_service
from app.services import deck as deck_service

router = APIRouter(prefix="/decks/{deck_id}/cards", tags=["cards"])


@router.get("/", response_model=List[FlashcardResponse])
def list_cards(
    deck_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = deck_service.get_owned_deck(deck_id, user, session)
    return card_service.list_cards(deck, session)


@router.post("/", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
def create_card(
    deck_id: int,
    body: FlashcardCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = deck_service.get_owned_deck(deck_id, user, session)
    return card_service.create_card(body, deck, session)


@router.get("/{card_id}", response_model=FlashcardResponse)
def get_card(
    deck_id: int,
    card_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = deck_service.get_owned_deck(deck_id, user, session)
    return card_service.get_card(card_id, deck, session)


@router.patch("/{card_id}", response_model=FlashcardResponse)
def update_card(
    deck_id: int,
    card_id: int,
    body: FlashcardUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = deck_service.get_owned_deck(deck_id, user, session)
    card = card_service.get_card(card_id, deck, session)
    return card_service.update_card(card, body, session)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    deck_id: int,
    card_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = deck_service.get_owned_deck(deck_id, user, session)
    card = card_service.get_card(card_id, deck, session)
    card_service.delete_card(card, session)
