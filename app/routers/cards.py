from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import Deck, Flashcard, User
from app.schemas import FlashcardCreate, FlashcardResponse, FlashcardUpdate

router = APIRouter(prefix="/decks/{deck_id}/cards", tags=["cards"])


def _get_owned_deck(deck_id: int, user: User, session: Session) -> Deck:
    deck = session.get(Deck, deck_id)
    if not deck or deck.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


def _get_card(card_id: int, deck: Deck, session: Session) -> Flashcard:
    card = session.get(Flashcard, card_id)
    if not card or card.deck_id != deck.id:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.get("/", response_model=List[FlashcardResponse])
def list_cards(
    deck_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = _get_owned_deck(deck_id, user, session)
    return session.exec(select(Flashcard).where(Flashcard.deck_id == deck.id)).all()


@router.post("/", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
def create_card(
    deck_id: int,
    body: FlashcardCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _get_owned_deck(deck_id, user, session)
    card = Flashcard(**body.model_dump(), deck_id=deck_id)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@router.get("/{card_id}", response_model=FlashcardResponse)
def get_card(
    deck_id: int,
    card_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = _get_owned_deck(deck_id, user, session)
    return _get_card(card_id, deck, session)


@router.patch("/{card_id}", response_model=FlashcardResponse)
def update_card(
    deck_id: int,
    card_id: int,
    body: FlashcardUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = _get_owned_deck(deck_id, user, session)
    card = _get_card(card_id, deck, session)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(card, field, value)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    deck_id: int,
    card_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = _get_owned_deck(deck_id, user, session)
    card = _get_card(card_id, deck, session)
    session.delete(card)
    session.commit()
