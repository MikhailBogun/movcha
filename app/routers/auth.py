from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.schemas import Token, UserCreate, UserResponse
from app.services import user as user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(body: UserCreate, session: Session = Depends(get_session)):
    return user_service.register_user(body.email, body.password, session)


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)
):
    token = user_service.authenticate_user(form.username, form.password, session)
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
