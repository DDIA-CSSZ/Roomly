from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import RequestStatus, UserRole


# ============================================================
# AUTH / TOKEN
# ============================================================

class Token(BaseModel):
    """Răspunsul de la endpoint-ul /login."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Conținutul decodat al unui JWT — pentru validare internă."""
    sub: str | None = None  # user ID ca string (per RFC 7519)
    exp: int | None = None


# ============================================================
# USER
# ============================================================

class UserBase(BaseModel):
    """Câmpuri partajate între Create / Response."""
    email: EmailStr
    full_name: Annotated[str, Field(min_length=2, max_length=150)]


class UserCreate(UserBase):
    """Payload pentru înregistrare (Create account)."""
    password: Annotated[str, Field(min_length=8, max_length=100)]
    # La self-registration, default rolul e GUEST.
    # Adminul va putea seta alt rol prin alt endpoint dedicat.
    role: UserRole = UserRole.GUEST
    room_id: Optional[int] = None  # opțional la creare; recepția poate aloca camera ulterior


class UserUpdate(BaseModel):
    """Update parțial (admin / self). Toate câmpurile opționale."""
    full_name: Optional[Annotated[str, Field(min_length=2, max_length=150)]] = None
    room_id: Optional[int] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    """Ce trimitem înapoi clientului. NU conține hashed_password."""
    id: int
    role: UserRole
    room_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """Folosit doar dacă vrei JSON login. Pentru OAuth2 form-data, nu-i nevoie."""
    email: EmailStr
    password: str


# ============================================================
# ROOM
# ============================================================

class RoomBase(BaseModel):
    room_number: Annotated[str, Field(min_length=1, max_length=20)]
    floor: Optional[int] = None


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    room_number: Optional[Annotated[str, Field(min_length=1, max_length=20)]] = None
    floor: Optional[int] = None
    is_active: Optional[bool] = None


class RoomResponse(RoomBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# SERVICE CATEGORY
# ============================================================

class ServiceCategoryBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=100)]
    description: Optional[Annotated[str, Field(max_length=255)]] = None


class ServiceCategoryCreate(ServiceCategoryBase):
    pass


class ServiceCategoryUpdate(BaseModel):
    name: Optional[Annotated[str, Field(min_length=2, max_length=100)]] = None
    description: Optional[Annotated[str, Field(max_length=255)]] = None
    is_active: Optional[bool] = None


class ServiceCategoryResponse(ServiceCategoryBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# REQUEST (entitatea centrală)
# ============================================================

class RequestCreate(BaseModel):
    """
    Payload când guest-ul trimite o cerere nouă.
    `guest_id` și `room_id` sunt deduse pe backend din JWT (din current_user),
    NU le primim de la client (ar fi vulnerabilitate IDOR).
    """
    service_category_id: int
    description: Annotated[str, Field(min_length=3, max_length=2000)]


class RequestAssign(BaseModel):
    """Payload pentru recepție când alocă cererea unui staff."""
    assigned_to_id: int


class RequestStatusUpdate(BaseModel):
    """Payload pentru actualizarea statusului (recepție sau staff)."""
    status: RequestStatus


# Schemele "embedded" pentru a oferi context bogat în RequestResponse,
# fără a forța clientul să facă request-uri separate pentru room/category/user.
class _UserMini(BaseModel):
    id: int
    full_name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class _RoomMini(BaseModel):
    id: int
    room_number: str

    model_config = ConfigDict(from_attributes=True)


class _ServiceCategoryMini(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class RequestResponse(BaseModel):
    """Răspuns complet pentru toate listările de cereri."""
    id: int
    description: str
    status: RequestStatus
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    # Relații expandate (mai puține round-trip-uri din frontend)
    guest: _UserMini
    room: _RoomMini
    service_category: _ServiceCategoryMini
    assigned_to: Optional[_UserMini] = None

    model_config = ConfigDict(from_attributes=True)