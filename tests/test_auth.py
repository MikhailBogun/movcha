from __future__ import annotations

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import auth_headers, create_user


def test_register(client: TestClient):
    resp = client.post(
        "/auth/register", json={"email": "new@test.com", "password": "pass123"}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@test.com"
    assert data["is_admin"] is False
    assert "hashed_password" not in data


def test_register_duplicate_email(client: TestClient, session: Session):
    create_user(session)
    resp = client.post(
        "/auth/register", json={"email": "user@test.com", "password": "pass123"}
    )
    assert resp.status_code == 400


def test_login_success(client: TestClient, session: Session):
    create_user(session)
    resp = client.post(
        "/auth/login", data={"username": "user@test.com", "password": "secret"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient, session: Session):
    create_user(session)
    resp = client.post(
        "/auth/login", data={"username": "user@test.com", "password": "wrong"}
    )
    assert resp.status_code == 401


def test_login_unknown_email(client: TestClient):
    resp = client.post(
        "/auth/login", data={"username": "nobody@test.com", "password": "x"}
    )
    assert resp.status_code == 401


def test_protected_route_requires_token(client: TestClient):
    resp = client.get("/decks/")
    assert resp.status_code == 401


def test_protected_route_with_invalid_token(client: TestClient):
    resp = client.get("/decks/", headers={"Authorization": "Bearer bad-token"})
    assert resp.status_code == 401


def test_me_returns_current_user(client: TestClient, session: Session):
    create_user(session)
    resp = client.get("/auth/me", headers=auth_headers(client))
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "user@test.com"
    assert "hashed_password" not in data


def test_me_requires_auth(client: TestClient):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_register_password_too_short(client: TestClient):
    resp = client.post(
        "/auth/register", json={"email": "x@test.com", "password": "abc"}
    )
    assert resp.status_code == 422


def test_register_password_too_long(client: TestClient):
    resp = client.post(
        "/auth/register", json={"email": "x@test.com", "password": "a" * 73}
    )
    assert resp.status_code == 422


def test_register_invalid_email(client: TestClient):
    resp = client.post(
        "/auth/register", json={"email": "not-an-email", "password": "pass123"}
    )
    assert resp.status_code == 422
