from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Flashcard
from app.sm2 import MASTERED_INTERVAL_DAYS, apply_sm2
from tests.conftest import auth_headers, create_card, create_deck, create_user

# --- SM-2 unit tests (no DB needed) ---

def _fresh_card() -> Flashcard:
    return Flashcard(
        deck_id=1,
        front_text="Q",
        back_text="A",
        interval=0,
        repetitions=0,
        easiness_factor=2.5,
        next_review=datetime.now(timezone.utc),
    )


def test_sm2_failed_recall_resets():
    card = _fresh_card()
    card.repetitions = 3
    card.interval = 6
    apply_sm2(card, rating=2)
    assert card.repetitions == 0
    assert card.interval == 1


def test_sm2_first_success():
    card = _fresh_card()
    apply_sm2(card, rating=5)
    assert card.repetitions == 1
    assert card.interval == 1


def test_sm2_second_success():
    card = _fresh_card()
    apply_sm2(card, rating=5)
    apply_sm2(card, rating=5)
    assert card.repetitions == 2
    assert card.interval == 6


def test_sm2_interval_grows_after_two_successes():
    card = _fresh_card()
    apply_sm2(card, rating=5)
    apply_sm2(card, rating=5)
    apply_sm2(card, rating=5)
    assert card.interval > 6


def test_sm2_easiness_decreases_on_hard():
    card = _fresh_card()
    ef_before = card.easiness_factor
    apply_sm2(card, rating=3)
    assert card.easiness_factor < ef_before


def test_sm2_easiness_never_below_1_3():
    card = _fresh_card()
    for _ in range(20):
        apply_sm2(card, rating=0)
    assert card.easiness_factor >= 1.3


def test_sm2_next_review_in_future():
    card = _fresh_card()
    apply_sm2(card, rating=4)
    assert card.next_review > datetime.now(timezone.utc)


@pytest.mark.parametrize("rating", [0, 1, 2, 3, 4, 5])
def test_sm2_all_ratings_valid(rating):
    card = _fresh_card()
    apply_sm2(card, rating=rating)
    assert card.interval >= 1


# --- API integration tests ---

def test_get_next_card_due(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    create_card(session, deck_id=deck.id)  # next_review defaults to now

    resp = client.get(f"/decks/{deck.id}/review/next", headers=auth_headers(client))
    assert resp.status_code == 200


def test_get_next_card_none_due(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    # Card due far in the future, interval not yet mastered
    from app.models import Flashcard as FC
    card = FC(
        deck_id=deck.id,
        front_text="Q",
        back_text="A",
        interval=5,
        repetitions=1,
        next_review=datetime.now(timezone.utc) + timedelta(days=5),
    )
    session.add(card)
    session.commit()

    resp = client.get(f"/decks/{deck.id}/review/next", headers=auth_headers(client))
    assert resp.status_code == 404


def test_submit_review_updates_card(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    card = create_card(session, deck_id=deck.id)

    resp = client.post(
        f"/decks/{deck.id}/review/{card.id}",
        json={"rating": 5},
        headers=auth_headers(client),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["card"]["repetitions"] == 1
    assert data["interval"] == 1


def test_submit_review_bad_rating_clamped(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    card = create_card(session, deck_id=deck.id)

    # Rating 10 should be clamped to 5 (perfect score)
    resp = client.post(
        f"/decks/{deck.id}/review/{card.id}",
        json={"rating": 10},
        headers=auth_headers(client),
    )
    assert resp.status_code == 200


def test_mastered_threshold():
    card = _fresh_card()
    # Drive card to mastered state
    for _ in range(10):
        apply_sm2(card, rating=5)
    assert card.interval >= MASTERED_INTERVAL_DAYS
