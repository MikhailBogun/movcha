from __future__ import annotations

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import auth_headers, create_card, create_deck, create_user


def test_create_card(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    resp = client.post(
        f"/decks/{deck.id}/cards/",
        json={"front_text": "Hello", "back_text": "Привіт"},
        headers=auth_headers(client),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["front_text"] == "Hello"
    assert data["repetitions"] == 0
    assert data["interval"] == 0


def test_list_cards(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    create_card(session, deck_id=deck.id, front="A")
    create_card(session, deck_id=deck.id, front="B")

    resp = client.get(f"/decks/{deck.id}/cards/", headers=auth_headers(client))
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_card(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    card = create_card(session, deck_id=deck.id)

    resp = client.get(f"/decks/{deck.id}/cards/{card.id}", headers=auth_headers(client))
    assert resp.status_code == 200
    assert resp.json()["id"] == card.id


def test_update_card(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    card = create_card(session, deck_id=deck.id)

    resp = client.patch(
        f"/decks/{deck.id}/cards/{card.id}",
        json={"front_text": "Goodbye"},
        headers=auth_headers(client),
    )
    assert resp.status_code == 200
    assert resp.json()["front_text"] == "Goodbye"


def test_delete_card(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    card = create_card(session, deck_id=deck.id)

    resp = client.delete(
        f"/decks/{deck.id}/cards/{card.id}", headers=auth_headers(client)
    )
    assert resp.status_code == 204
    assert (
        client.get(
            f"/decks/{deck.id}/cards/{card.id}", headers=auth_headers(client)
        ).status_code
        == 404
    )


def test_card_belongs_to_deck(client: TestClient, session: Session):
    user = create_user(session)
    deck1 = create_deck(session, owner_id=user.id, name="D1")
    deck2 = create_deck(session, owner_id=user.id, name="D2")
    card = create_card(session, deck_id=deck1.id)

    # Card from deck1 is not accessible via deck2's URL
    resp = client.get(
        f"/decks/{deck2.id}/cards/{card.id}", headers=auth_headers(client)
    )
    assert resp.status_code == 404
