from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session

from app.models import UserSession

_PING_TIMEOUT_SECONDS = 120


def _utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def start_session(user_id: int, session: Session) -> UserSession:
    s = UserSession(user_id=user_id)
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


def ping_session(session_id: int, user_id: int, session: Session) -> UserSession:
    s = session.get(UserSession, session_id)
    if not s or s.user_id != user_id or s.ended_at is not None:
        raise HTTPException(status_code=404, detail="Session not found")
    s.last_ping_at = datetime.now(timezone.utc)
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


def end_session(session_id: int, user_id: int, session: Session) -> UserSession:
    s = session.get(UserSession, session_id)
    if not s or s.user_id != user_id or s.ended_at is not None:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(timezone.utc)
    last_ping = _utc(s.last_ping_at)
    started = _utc(s.started_at)

    gap_since_ping = (now - last_ping).total_seconds()
    effective_end = last_ping if gap_since_ping > _PING_TIMEOUT_SECONDS else now

    s.ended_at = now
    s.duration_seconds = max(0, int((effective_end - started).total_seconds()))
    session.add(s)
    session.commit()
    session.refresh(s)
    return s
