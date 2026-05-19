from __future__ import annotations

import os

from sqlmodel import Session, create_engine

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", "mysql+pymysql://root:password@db/flashcards_db"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=True)


def get_session():
    with Session(engine) as session:
        yield session
