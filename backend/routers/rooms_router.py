from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import CurrentUser, require_role
from database import get_db
from models import Room, UserRole
from schemas import RoomCreate, RoomResponse

router = APIRouter(prefix="/rooms", tags=["Rooms"])


# ============================================================
# LIST ROOMS
# ============================================================

@router.get(
    "",
    response_model=list[RoomResponse],
    summary="List all rooms",
)
def list_rooms(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    include_inactive: Annotated[
        bool,
        Query(description="Include rooms marked as inactive (admin only).")
    ] = False,
) -> list[Room]:
    """
    Listează camerele.

    - Default: doar camerele active (utile pentru guest la submit cerere).
    - `include_inactive=true`: vede toate (doar adminii pot folosi flag-ul).
    """
    query = db.query(Room)

    # Doar adminul poate vedea camerele inactive
    if include_inactive and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view inactive rooms.",
        )

    if not include_inactive:
        query = query.filter(Room.is_active == True)  # noqa: E712 (SQLAlchemy nu acceptă `is True`)

    return query.order_by(Room.room_number).all()


# ============================================================
# CREATE ROOM (admin only)
# ============================================================

@router.post(
    "",
    response_model=RoomResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new room (admin only)",
)
def create_room(
    payload: RoomCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[object, Depends(require_role(UserRole.ADMIN))],
) -> Room:
    """Creează o cameră nouă. Necesită rol ADMIN."""
    # Verifică duplicate la nivel aplicație (mesaj curat în loc de IntegrityError)
    existing = db.query(Room).filter(Room.room_number == payload.room_number).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A room with number '{payload.room_number}' already exists.",
        )

    new_room = Room(
        room_number=payload.room_number,
        floor=payload.floor,
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room