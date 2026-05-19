from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.schemas import DeckCreate, DeckResponse, DeckUpdate
from app.services import deck as deck_service

router = APIRouter(prefix="/decks", tags=["decks"])


@router.get("/", response_model=List[DeckResponse])
def list_decks(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    return deck_service.list_decks(user, session)


@router.post("/", response_model=DeckResponse, status_code=status.HTTP_201_CREATED)
def create_deck(
    body: DeckCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return deck_service.create_deck(body, user, session)


@router.get("/{deck_id}", response_model=DeckResponse)
def get_deck(
    deck_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return deck_service.get_owned_deck(deck_id, user, session)


@router.patch("/{deck_id}", response_model=DeckResponse)
def update_deck(
    deck_id: int,
    body: DeckUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = deck_service.get_owned_deck(deck_id, user, session)
    return deck_service.update_deck(deck, body, session)


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deck(
    deck_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = deck_service.get_owned_deck(deck_id, user, session)
    deck_service.delete_deck(deck, session)
