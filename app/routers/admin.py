from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.schemas import UserStats
from app.services import admin as admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/users", response_model=List[UserStats])
def list_users_stats(
    admin: User = Depends(_require_admin), session: Session = Depends(get_session)
):
    users = admin_service.list_non_admin_users(session)
    return [admin_service.get_user_stats(u, session) for u in users]


@router.get("/users/{user_id}", response_model=UserStats)
def get_user_stats(
    user_id: int,
    admin: User = Depends(_require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return admin_service.get_user_stats(user, session)
