from __future__ import annotations

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import auth_headers, create_deck, create_user


def test_create_deck(client: TestClient, session: Session):
    create_user(session)
    resp = client.post(
        "/decks/", json={"name": "Spanish"}, headers=auth_headers(client)
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Spanish"


def test_list_decks_empty(client: TestClient, session: Session):
    create_user(session)
    resp = client.get("/decks/", headers=auth_headers(client))
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_decks_only_own(client: TestClient, session: Session):
    user1 = create_user(session, email="u1@test.com")
    user2 = create_user(session, email="u2@test.com")
    create_deck(session, owner_id=user1.id, name="Deck A")
    create_deck(session, owner_id=user2.id, name="Deck B")

    resp = client.get("/decks/", headers=auth_headers(client, "u1@test.com"))
    names = [d["name"] for d in resp.json()]
    assert names == ["Deck A"]


def test_get_deck(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    resp = client.get(f"/decks/{deck.id}", headers=auth_headers(client))
    assert resp.status_code == 200
    assert resp.json()["id"] == deck.id


def test_get_deck_not_found(client: TestClient, session: Session):
    create_user(session)
    resp = client.get("/decks/999", headers=auth_headers(client))
    assert resp.status_code == 404


def test_get_deck_wrong_owner(client: TestClient, session: Session):
    user1 = create_user(session, email="u1@test.com")
    create_user(session, email="u2@test.com")
    deck = create_deck(session, owner_id=user1.id)

    resp = client.get(f"/decks/{deck.id}", headers=auth_headers(client, "u2@test.com"))
    assert resp.status_code == 404


def test_update_deck(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    resp = client.patch(
        f"/decks/{deck.id}", json={"name": "Updated"}, headers=auth_headers(client)
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


def test_delete_deck(client: TestClient, session: Session):
    user = create_user(session)
    deck = create_deck(session, owner_id=user.id)
    resp = client.delete(f"/decks/{deck.id}", headers=auth_headers(client))
    assert resp.status_code == 204
    assert (
        client.get(f"/decks/{deck.id}", headers=auth_headers(client)).status_code == 404
    )
