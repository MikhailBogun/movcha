from __future__ import annotations

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.auth import create_access_token, hash_password, verify_password
from app.models import User


def register_user(email: str, password: str, session: Session) -> User:
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=email, hashed_password=hash_password(password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(email: str, password: str, session: Session) -> str:
    """Returns a JWT access token or raises 401."""
    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return create_access_token(user.id)
