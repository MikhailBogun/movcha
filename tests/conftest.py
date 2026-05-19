from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.auth import hash_password
from app.database import get_session
from app.main import app
from app.models import Deck, Flashcard, User


@asynccontextmanager
async def _noop_lifespan(_):
    yield


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def override_get_session():
        yield session

    # Patch lifespan so TestClient doesn't try to connect to MySQL on startup.
    original_lifespan = app.router.lifespan_context
    app.router.lifespan_context = _noop_lifespan
    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as c:
        yield c

    app.router.lifespan_context = original_lifespan
    app.dependency_overrides.clear()


# --- DB helpers ---

def create_user(
    session: Session,
    email: str = "user@test.com",
    password: str = "secret",
    is_admin: bool = False,
) -> User:
    user = User(email=email, hashed_password=hash_password(password), is_admin=is_admin)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_token(client: TestClient, email: str = "user@test.com", password: str = "secret") -> str:
    resp = client.post("/auth/login", data={"username": email, "password": password})
    return resp.json()["access_token"]


def auth_headers(client: TestClient, email: str = "user@test.com", password: str = "secret") -> dict:
    return {"Authorization": f"Bearer {get_token(client, email, password)}"}


def create_deck(session: Session, owner_id: int, name: str = "Test Deck") -> Deck:
    deck = Deck(name=name, owner_id=owner_id)
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck


def create_card(
    session: Session,
    deck_id: int,
    front: str = "Hello",
    back: str = "Привіт",
    interval: int = 0,
    repetitions: int = 0,
) -> Flashcard:
    card = Flashcard(
        deck_id=deck_id,
        front_text=front,
        back_text=back,
        interval=interval,
        repetitions=repetitions,
        next_review=datetime.now(timezone.utc),
    )
    session.add(card)
    session.commit()
    session.refresh(card)
    return card
