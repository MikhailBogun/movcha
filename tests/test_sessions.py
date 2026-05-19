from __future__ import annotations

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import auth_headers, create_user


def test_start_session(client: TestClient, session: Session):
    create_user(session)
    resp = client.post("/sessions/start", headers=auth_headers(client))
    assert resp.status_code == 200
    data = resp.json()
    assert data["ended_at"] is None
    assert data["duration_seconds"] is None


def test_ping_session(client: TestClient, session: Session):
    create_user(session)
    headers = auth_headers(client)
    session_id = client.post("/sessions/start", headers=headers).json()["id"]

    resp = client.post(f"/sessions/{session_id}/ping", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["ended_at"] is None


def test_end_session(client: TestClient, session: Session):
    create_user(session)
    headers = auth_headers(client)
    session_id = client.post("/sessions/start", headers=headers).json()["id"]

    resp = client.post(f"/sessions/{session_id}/end", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["ended_at"] is not None
    assert data["duration_seconds"] is not None
    assert data["duration_seconds"] >= 0


def test_end_session_twice(client: TestClient, session: Session):
    create_user(session)
    headers = auth_headers(client)
    session_id = client.post("/sessions/start", headers=headers).json()["id"]
    client.post(f"/sessions/{session_id}/end", headers=headers)

    resp = client.post(f"/sessions/{session_id}/end", headers=headers)
    assert resp.status_code == 404


def test_cannot_access_other_users_session(client: TestClient, session: Session):
    create_user(session, email="u1@test.com")
    create_user(session, email="u2@test.com")

    session_id = client.post(
        "/sessions/start", headers=auth_headers(client, "u1@test.com")
    ).json()["id"]
    resp = client.post(
        f"/sessions/{session_id}/end", headers=auth_headers(client, "u2@test.com")
    )
    assert resp.status_code == 404
