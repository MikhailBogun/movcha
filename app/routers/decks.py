from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import Deck, User
from app.schemas import DeckCreate, DeckResponse, DeckUpdate

router = APIRouter(prefix="/decks", tags=["decks"])


def _get_owned_deck(deck_id: int, user: User, session: Session) -> Deck:
    deck = session.get(Deck, deck_id)
    if not deck or deck.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.get("/", response_model=List[DeckResponse])
def list_decks(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return session.exec(select(Deck).where(Deck.owner_id == user.id)).all()


@router.post("/", response_model=DeckResponse, status_code=status.HTTP_201_CREATED)
def create_deck(
    body: DeckCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = Deck(**body.model_dump(), owner_id=user.id)
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck


@router.get("/{deck_id}", response_model=DeckResponse)
def get_deck(
    deck_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return _get_owned_deck(deck_id, user, session)


@router.patch("/{deck_id}", response_model=DeckResponse)
def update_deck(
    deck_id: int,
    body: DeckUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = _get_owned_deck(deck_id, user, session)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(deck, field, value)
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deck(
    deck_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deck = _get_owned_deck(deck_id, user, session)
    session.delete(deck)
    session.commit()
