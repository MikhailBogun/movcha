from __future__ import annotations

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import auth_headers, create_card, create_deck, create_user


def test_admin_list_users(client: TestClient, session: Session):
    create_user(session, email="admin@test.com", is_admin=True)
    create_user(session, email="user@test.com")

    resp = client.get("/admin/users", headers=auth_headers(client, "admin@test.com"))
    assert resp.status_code == 200
    emails = [u["email"] for u in resp.json()]
    assert "user@test.com" in emails
    assert "admin@test.com" not in emails  # admins excluded from list


def test_admin_get_user_stats(client: TestClient, session: Session):
    create_user(session, email="admin@test.com", is_admin=True)
    user = create_user(session, email="user@test.com")
    deck = create_deck(session, owner_id=user.id)
    create_card(session, deck_id=deck.id)
    create_card(session, deck_id=deck.id, interval=25, repetitions=5)  # mastered

    resp = client.get(f"/admin/users/{user.id}", headers=auth_headers(client, "admin@test.com"))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_cards"] == 2
    assert data["mastered_cards"] == 1
    assert data["new_cards"] == 1


def test_non_admin_blocked(client: TestClient, session: Session):
    create_user(session)
    resp = client.get("/admin/users", headers=auth_headers(client))
    assert resp.status_code == 403


def test_admin_user_not_found(client: TestClient, session: Session):
    create_user(session, email="admin@test.com", is_admin=True)
    resp = client.get("/admin/users/9999", headers=auth_headers(client, "admin@test.com"))
    assert resp.status_code == 404


def test_admin_stats_zero_for_new_user(client: TestClient, session: Session):
    create_user(session, email="admin@test.com", is_admin=True)
    user = create_user(session, email="fresh@test.com")

    resp = client.get(f"/admin/users/{user.id}", headers=auth_headers(client, "admin@test.com"))
    data = resp.json()
    assert data["total_cards"] == 0
    assert data["total_reviews"] == 0
    assert data["total_time_seconds"] == 0
    assert data["last_active"] is None
