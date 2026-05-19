from __future__ import annotations

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Deck, Flashcard
from app.schemas import FlashcardCreate, FlashcardUpdate


def get_card(card_id: int, deck: Deck, session: Session) -> Flashcard:
    card = session.get(Flashcard, card_id)
    if not card or card.deck_id != deck.id:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


def list_cards(deck: Deck, session: Session) -> list[Flashcard]:
    return session.exec(select(Flashcard).where(Flashcard.deck_id == deck.id)).all()


def create_card(data: FlashcardCreate, deck: Deck, session: Session) -> Flashcard:
    card = Flashcard(**data.model_dump(), deck_id=deck.id)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


def update_card(card: Flashcard, data: FlashcardUpdate, session: Session) -> Flashcard:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(card, field, value)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


def delete_card(card: Flashcard, session: Session) -> None:
    session.delete(card)
    session.commit()
