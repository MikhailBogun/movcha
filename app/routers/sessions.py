from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User, UserSession
from app.schemas import SessionResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])

# If no ping arrives within this window, we cap the session duration at last_ping.
_PING_TIMEOUT_SECONDS = 120


def _utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@router.post("/start", response_model=SessionResponse)
def start_session(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    s = UserSession(user_id=user.id)
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


@router.post("/{session_id}/ping", response_model=SessionResponse)
def ping_session(
    session_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    s = session.get(UserSession, session_id)
    if not s or s.user_id != user.id or s.ended_at is not None:
        raise HTTPException(status_code=404, detail="Session not found")
    s.last_ping_at = datetime.now(timezone.utc)
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


@router.post("/{session_id}/end", response_model=SessionResponse)
def end_session(
    session_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    s = session.get(UserSession, session_id)
    if not s or s.user_id != user.id or s.ended_at is not None:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(timezone.utc)
    last_ping = _utc(s.last_ping_at)
    started = _utc(s.started_at)

    # If the tab was left open without pings, cap duration at last known activity.
    gap_since_ping = (now - last_ping).total_seconds()
    effective_end = last_ping if gap_since_ping > _PING_TIMEOUT_SECONDS else now

    s.ended_at = now
    s.duration_seconds = max(0, int((effective_end - started).total_seconds()))
    session.add(s)
    session.commit()
    session.refresh(s)
    return s
