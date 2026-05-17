from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import CurrentUser, require_role
from database import get_db
from models import Request, RequestStatus, Room, User, UserRole
from schemas import RoomCheckIn, RoomCreate, RoomOccupancyResponse, RoomResponse, UserResponse

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


@router.get(
    "/occupancy",
    response_model=list[RoomOccupancyResponse],
    summary="List rooms with occupancy and active request counts",
)
def list_room_occupancy(
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN))],
) -> list[RoomOccupancyResponse]:
    rooms = db.query(Room).order_by(Room.room_number).all()
    active_statuses = [
        RequestStatus.PENDING,
        RequestStatus.ASSIGNED,
        RequestStatus.IN_PROGRESS,
    ]

    result: list[RoomOccupancyResponse] = []
    for room in rooms:
        occupant = (
            db.query(User)
            .filter(
                User.room_id == room.id,
                User.role == UserRole.GUEST,
                User.is_active == True,  # noqa: E712
            )
            .order_by(User.created_at.desc())
            .first()
        )
        active_requests_count = (
            db.query(Request)
            .filter(Request.room_id == room.id, Request.status.in_(active_statuses))
            .count()
        )
        result.append(
            RoomOccupancyResponse(
                id=room.id,
                room_number=room.room_number,
                floor=room.floor,
                is_active=room.is_active,
                created_at=room.created_at,
                occupied_by=UserResponse.model_validate(occupant) if occupant else None,
                active_requests_count=active_requests_count,
            )
        )

    return result


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


@router.patch(
    "/{room_id}/check-in",
    response_model=RoomOccupancyResponse,
    summary="Check in a guest to a room (receptionist + admin)",
)
def check_in_guest(
    room_id: int,
    payload: RoomCheckIn,
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN))],
) -> RoomOccupancyResponse:
    room = db.query(Room).filter(Room.id == room_id).first()
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
    if not room.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is inactive.")

    guest = db.query(User).filter(User.id == payload.user_id).first()
    if guest is None or guest.role != UserRole.GUEST:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found.")
    if not guest.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guest is inactive.")

    current_occupant = (
        db.query(User)
        .filter(User.room_id == room.id, User.role == UserRole.GUEST, User.is_active == True)  # noqa: E712
        .first()
    )
    if current_occupant is not None and current_occupant.id != guest.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room is already occupied by another guest.",
        )

    guest.room_id = room.id
    db.commit()
    db.refresh(room)

    active_requests_count = (
        db.query(Request)
        .filter(
            Request.room_id == room.id,
            Request.status.in_([RequestStatus.PENDING, RequestStatus.ASSIGNED, RequestStatus.IN_PROGRESS]),
        )
        .count()
    )
    return RoomOccupancyResponse(
        id=room.id,
        room_number=room.room_number,
        floor=room.floor,
        is_active=room.is_active,
        created_at=room.created_at,
        occupied_by=UserResponse.model_validate(guest),
        active_requests_count=active_requests_count,
    )


@router.patch(
    "/{room_id}/check-out",
    response_model=RoomOccupancyResponse,
    summary="Check out the active guest from a room (receptionist + admin)",
)
def check_out_guest(
    room_id: int,
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN))],
) -> RoomOccupancyResponse:
    room = db.query(Room).filter(Room.id == room_id).first()
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    guest = (
        db.query(User)
        .filter(User.room_id == room.id, User.role == UserRole.GUEST, User.is_active == True)  # noqa: E712
        .first()
    )
    if guest is not None:
        guest.room_id = None
        db.commit()

    active_requests_count = (
        db.query(Request)
        .filter(
            Request.room_id == room.id,
            Request.status.in_([RequestStatus.PENDING, RequestStatus.ASSIGNED, RequestStatus.IN_PROGRESS]),
        )
        .count()
    )
    return RoomOccupancyResponse(
        id=room.id,
        room_number=room.room_number,
        floor=room.floor,
        is_active=room.is_active,
        created_at=room.created_at,
        occupied_by=None,
        active_requests_count=active_requests_count,
    )
