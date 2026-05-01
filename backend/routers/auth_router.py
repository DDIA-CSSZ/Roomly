from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth import CurrentUser
from database import get_db
from models import Room, User, UserRole
from schemas import Token, UserCreate, UserResponse
from security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


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