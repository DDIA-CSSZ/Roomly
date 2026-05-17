from datetime import timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth import CurrentUser, require_role
from database import get_db
from models import Room, User, UserRole
from schemas import (
    PasswordResetConfirm,
    PasswordResetRequest,
    PasswordResetRequestResponse,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from security import create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

PASSWORD_RESET_TOKEN_MINUTES = 30


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account",
)
def register(
    payload: UserCreate,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """
    Self-registration endpoint.

    Reguli de securitate aplicate aici:
    - Email-ul trebuie să fie unic.
    - Rolul este FORȚAT la GUEST, indiferent ce trimite clientul în payload.
      (Adminii și staff-ul se creează prin endpoint-uri admin-only, viitoare.)
    - Dacă `room_id` e specificat, validăm că există și e activă.
    """
    # 1. Verifică email duplicat
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # 2. Validare room_id (dacă a fost trimis)
    if payload.room_id is not None:
        room = db.query(Room).filter(Room.id == payload.room_id).first()
        if room is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room with id {payload.room_id} does not exist.",
            )
        if not room.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The specified room is not active.",
            )

    # 3. Creează user-ul. Forțăm GUEST — ignorăm orice rol trimis de client.
    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=UserRole.GUEST,
        room_id=payload.room_id,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=Token,
    summary="Log in and receive a JWT access token",
)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    """
    Login compatibil OAuth2 password flow.

    Trimite ca `application/x-www-form-urlencoded`:
        username=<email>&password=<parola>

    NOTĂ: OAuth2PasswordRequestForm cere câmpul `username`, dar noi îl folosim ca email.
    Astfel rămânem compatibili cu butonul "Authorize" din Swagger UI.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    # Mesaj generic intenționat — nu dezvăluim dacă email-ul există sau parola e greșită.
    # Previne user enumeration attacks.
    invalid_credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise invalid_credentials_exc

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact the administrator.",
        )

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer")


# ============================================================
# CURRENT USER (test endpoint pentru a verifica autentificarea)
# ============================================================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user",
)
def get_me(current_user: CurrentUser) -> User:
    """Returnează datele user-ului asociat token-ului JWT din header."""
    return current_user


@router.post(
    "/forgot-password",
    response_model=PasswordResetRequestResponse,
    summary="Request a password reset token",
)
def forgot_password(
    payload: PasswordResetRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PasswordResetRequestResponse:
    """
    Demo/local password reset.

    Returnăm același mesaj indiferent dacă emailul există, ca să evităm user
    enumeration. Pentru conturile existente, includem tokenul în răspuns ca să
    poată fi testat fără integrare email.
    """
    message = "Dacă emailul există, vei primi instrucțiuni pentru resetarea parolei."
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not user.is_active:
        return PasswordResetRequestResponse(message=message)

    token = create_access_token(
        subject=f"password-reset:{user.id}",
        expires_delta=timedelta(minutes=PASSWORD_RESET_TOKEN_MINUTES),
    )
    return PasswordResetRequestResponse(message=message, reset_token=token)


@router.post(
    "/reset-password",
    response_model=PasswordResetRequestResponse,
    summary="Reset password with a reset token",
)
def reset_password(
    payload: PasswordResetConfirm,
    db: Annotated[Session, Depends(get_db)],
) -> PasswordResetRequestResponse:
    try:
        token_payload = decode_access_token(payload.token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tokenul de resetare este invalid sau a expirat.",
        ) from None

    subject = token_payload.get("sub")
    if not isinstance(subject, str) or not subject.startswith("password-reset:"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tokenul de resetare este invalid.",
        )

    try:
        user_id = int(subject.removeprefix("password-reset:"))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tokenul de resetare este invalid.",
        ) from None

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tokenul de resetare este invalid.",
        )

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return PasswordResetRequestResponse(message="Parola a fost resetată cu succes.")


@router.get(
    "/staff",
    response_model=list[UserResponse],
    summary="List active staff users (receptionist + admin)",
)
def list_staff_users(
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN))],
) -> list[User]:
    """Returneaza membrii staff activi disponibili pentru asignarea cererilor."""
    return (
        db.query(User)
        .filter(User.role == UserRole.STAFF, User.is_active == True)  # noqa: E712
        .order_by(User.full_name)
        .all()
    )


@router.get(
    "/users",
    response_model=list[UserResponse],
    summary="List all user accounts (receptionist + admin)",
)
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN))],
) -> list[User]:
    """Returneaza toate conturile create, ordonate pe rol si nume."""
    return db.query(User).order_by(User.role, User.full_name).all()


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user account (admin only)",
)
def create_user(
    payload: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_role(UserRole.ADMIN))],
) -> User:
    """Creeaza conturi guest sau operationale din zona de administrare."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    room_id = None
    if payload.role == UserRole.GUEST and payload.room_id is not None:
        room = db.query(Room).filter(Room.id == payload.room_id).first()
        if room is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room with id {payload.room_id} does not exist.",
            )
        if not room.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The specified room is not active.",
            )
        room_id = room.id

    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        room_id=room_id,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Update a user account (receptionist + admin)",
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN))],
) -> User:
    """
    Actualizeaza un cont.

    Receptionistii pot asigna/dezasigna camere doar pentru guest-uri.
    Adminii pot face acelasi lucru; campurile administrative raman disponibile
    doar pentru admin.
    """
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} does not exist.",
        )

    update_data = payload.model_dump(exclude_unset=True)

    if current_user.role != UserRole.ADMIN:
        forbidden_fields = {"full_name", "is_active", "role"} & update_data.keys()
        if forbidden_fields:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Receptionists can only update guest room assignments.",
            )

    if current_user.id == target.id:
        if update_data.get("is_active") is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators cannot deactivate their own account.",
            )
        if update_data.get("role") is not None and update_data["role"] != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators cannot remove their own admin role.",
            )

    if "room_id" in update_data:
        if target.role != UserRole.GUEST:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rooms can only be assigned to guest accounts.",
            )

        room_id = update_data["room_id"]
        if room_id is not None:
            room = db.query(Room).filter(Room.id == room_id).first()
            if room is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Room with id {room_id} does not exist.",
                )
            if not room.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The specified room is not active.",
                )
        target.room_id = room_id

    if current_user.role == UserRole.ADMIN:
        for field in ("full_name", "is_active", "role"):
            if field in update_data:
                setattr(target, field, update_data[field])
        if "role" in update_data and update_data["role"] != UserRole.GUEST:
            target.room_id = None

    db.commit()
    db.refresh(target)
    return target


@router.delete(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Deactivate a user account (admin only)",
)
def deactivate_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
) -> User:
    """
    Dezactiveaza un cont in loc sa il stearga fizic.

    Pastram istoricul cererilor si relatiile existente, dar contul nu mai poate
    fi folosit la login sau asignari active.
    """
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} does not exist.",
        )
    if target.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    target.is_active = False
    if target.role == UserRole.GUEST:
        target.room_id = None

    db.commit()
    db.refresh(target)
    return target
