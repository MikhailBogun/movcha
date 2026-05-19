from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.schemas import SessionResponse
from app.services import session as session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/start", response_model=SessionResponse)
def start_session(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    return session_service.start_session(user.id, session)


@router.post("/{session_id}/ping", response_model=SessionResponse)
def ping_session(
    session_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return session_service.ping_session(session_id, user.id, session)


@router.post("/{session_id}/end", response_model=SessionResponse)
def end_session(
    session_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return session_service.end_session(session_id, user.id, session)
