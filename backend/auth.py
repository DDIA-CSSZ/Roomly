from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole
from security import decode_access_token

# tokenUrl = path-ul endpoint-ului de login (definit în routerul de auth).
# Folosit doar de Swagger UI pentru butonul "Authorize".
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ============================================================
# CURRENT USER
# ============================================================

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """
    Decodează JWT-ul din header-ul Authorization și returnează user-ul din DB.
    Folosește în orice rută protejată: `user: User = Depends(get_current_user)`.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    return user


# Alias type pentru a-l folosi mai compact în signaturi:
# def my_route(user: CurrentUser, ...): ...
CurrentUser = Annotated[User, Depends(get_current_user)]


# ============================================================
# ROLE-BASED AUTHORIZATION
# ============================================================

def require_role(*allowed_roles: UserRole):
    """
    Factory de dependency pentru autorizare pe roluri.

    Exemple de folosire în rute:
        @router.get("/all-requests")
        def list_all(user: User = Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN))):
            ...

        @router.post("/rooms", dependencies=[Depends(require_role(UserRole.ADMIN))])
        def create_room(...):
            ...
    """
    def role_checker(current_user: CurrentUser) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of roles: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker