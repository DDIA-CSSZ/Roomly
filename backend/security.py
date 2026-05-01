from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

from config import settings

# bcrypt cu rounds=12 (default passlib) — bun balans între securitate și viteză
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(plain_password: str) -> str:
    """Hash-uiește o parolă plain-text cu bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifică dacă parola plain-text corespunde hash-ului stocat."""
    return pwd_context.verify(plain_password, hashed_password)


# ============================================================
# JWT
# ============================================================

def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Generează un JWT semnat HS256.
    `subject` = user ID (va fi convertit la string per RFC 7519).
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decodează și validează un JWT.
    Aruncă jwt.PyJWTError (sau subclasă) dacă e invalid/expirat.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])