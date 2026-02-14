"""Authentication service — Google OAuth2 + JWT session management."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import JWTError, jwt
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User, Quota

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


def verify_google_token(credential: str) -> dict:
    """Verify a Google ID token and return the payload."""
    settings = get_settings()
    try:
        payload = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.google_client_id,
        )
        if payload.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError("Invalid issuer")
        return payload
    except Exception as exc:
        logger.error("Google token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {exc}",
        )


def create_jwt(user: User) -> str:
    """Create a UCP session JWT for the given user."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "picture": user.picture or "",
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_jwt(token: str) -> dict:
    """Decode and validate a UCP JWT."""
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        )


async def upsert_user(db: AsyncSession, google_payload: dict) -> User:
    """Create or update a user from a Google token payload.
    First user in the DB is auto-promoted to admin.
    """
    google_id = google_payload["sub"]
    email = google_payload.get("email", "")
    name = google_payload.get("name", email)
    picture = google_payload.get("picture", "")

    # Check if user exists
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user:
        # Update last login and profile info
        user.last_login = datetime.utcnow()
        user.name = name
        user.picture = picture
        await db.commit()
        await db.refresh(user)
        return user

    # New user — check if DB is empty → first user becomes admin
    count = await db.scalar(select(func.count()).select_from(User))
    role = "admin" if count == 0 else "user"

    user = User(
        google_id=google_id,
        email=email,
        name=name,
        picture=picture,
        role=role,
    )
    db.add(user)
    await db.flush()

    # Create default quota
    quota = Quota(
        user_id=user.id,
        max_vcpus=8,
        max_ram_gb=16,
        max_disk_gb=200,
        allowed_networks="",
    )
    db.add(quota)
    await db.commit()
    await db.refresh(user)

    logger.info("New user registered: %s (%s) — role: %s", name, email, role)
    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency that extracts and validates the current user from JWT."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = decode_jwt(credentials.credentials)
    user_id = int(payload["sub"])

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """FastAPI dependency — require admin role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
