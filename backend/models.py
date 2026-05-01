import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    String, Integer, Text, Boolean, DateTime, ForeignKey,
    Enum as SQLEnum, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ============================================================
# ENUMS
# ============================================================

class UserRole(str, enum.Enum):
    """Rolurile actorilor identificați în Persona Map."""
    GUEST = "guest"
    RECEPTIONIST = "receptionist"
    STAFF = "staff"
    ADMIN = "admin"


class RequestStatus(str, enum.Enum):
    """Ciclul de viață al unei cereri."""
    PENDING = "pending"            # creată de guest, neasignată
    ASSIGNED = "assigned"          # recepția a alocat-o unui staff
    IN_PROGRESS = "in_progress"    # staff-ul a început lucrul
    COMPLETED = "completed"        # finalizată
    CANCELLED = "cancelled"        # anulată (guest sau recepție)


# ============================================================
# ROOM
# ============================================================

class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    floor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Un guest este cazat într-o cameră (one-to-many: o cameră poate avea mai mulți guests în istoric)
    guests: Mapped[List["User"]] = relationship(back_populates="room")
    # Toate cererile generate din această cameră
    requests: Mapped[List["Request"]] = relationship(back_populates="room")


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole), nullable=False, default=UserRole.GUEST, index=True
    )

    # Doar guest-urile au room_id setat. Staff/Receptionist/Admin = NULL.
    room_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Camera asociată (doar pentru guests)
    room: Mapped[Optional["Room"]] = relationship(back_populates="guests")

    # Cererile pe care acest user le-a TRIMIS (relevant pentru guests)
    submitted_requests: Mapped[List["Request"]] = relationship(
        back_populates="guest",
        foreign_keys="Request.guest_id",
    )

    # Cererile pe care acest user le-a PRIMIT spre execuție (relevant pentru staff)
    assigned_requests: Mapped[List["Request"]] = relationship(
        back_populates="assigned_to",
        foreign_keys="Request.assigned_to_id",
    )


# ============================================================
# SERVICE CATEGORY
# ============================================================

class ServiceCategory(Base):
    """
    Tipurile de servicii pe care un guest le poate cere:
    Room Service, Housekeeping, Maintenance, Consumabile, Sesizare, etc.
    """
    __tablename__ = "service_categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    requests: Mapped[List["Request"]] = relationship(back_populates="service_category")


# ============================================================
# REQUEST (entitatea centrală)
# ============================================================

class Request(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Cine a trimis cererea (User cu rol GUEST)
    guest_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # De la ce cameră (denormalizat din User.room_id pentru a păstra context istoric:
    # dacă guest-ul face check-out, cererea trebuie să rămână atașată camerei la momentul creării)
    room_id: Mapped[int] = mapped_column(
        ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Ce tip de serviciu
    service_category_id: Mapped[int] = mapped_column(
        ForeignKey("service_categories.id", ondelete="RESTRICT"), nullable=False
    )

    description: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[RequestStatus] = mapped_column(
        SQLEnum(RequestStatus),
        nullable=False,
        default=RequestStatus.PENDING,
        index=True,
    )

    # Cui i s-a alocat (NULL când status = PENDING)
    assigned_to_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    guest: Mapped["User"] = relationship(
        back_populates="submitted_requests", foreign_keys=[guest_id]
    )
    assigned_to: Mapped[Optional["User"]] = relationship(
        back_populates="assigned_requests", foreign_keys=[assigned_to_id]
    )
    room: Mapped["Room"] = relationship(back_populates="requests")
    service_category: Mapped["ServiceCategory"] = relationship(back_populates="requests")