from __future__ import annotations

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Deck, User
from app.schemas import DeckCreate, DeckUpdate


def get_owned_deck(deck_id: int, user: User, session: Session) -> Deck:
    deck = session.get(Deck, deck_id)
    if not deck or deck.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


def list_decks(user: User, session: Session) -> list[Deck]:
    return session.exec(select(Deck).where(Deck.owner_id == user.id)).all()


def create_deck(data: DeckCreate, owner: User, session: Session) -> Deck:
    deck = Deck(**data.model_dump(), owner_id=owner.id)
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck


def update_deck(deck: Deck, data: DeckUpdate, session: Session) -> Deck:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(deck, field, value)
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck


def delete_deck(deck: Deck, session: Session) -> None:
    session.delete(deck)
    session.commit()
