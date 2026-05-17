from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from auth import CurrentUser, require_role
from database import get_db
from models import Request, RequestComment, RequestEvent, RequestStatus, ServiceCategory, User, UserRole
from schemas import (
    RequestAssign,
    RequestCommentCreate,
    RequestCommentResponse,
    RequestCreate,
    RequestEventResponse,
    RequestPriorityUpdate,
    RequestResponse,
    RequestStatusUpdate,
    RequestUpdate,
)

router = APIRouter(prefix="/requests", tags=["Requests"])


# ============================================================
# CONSTANTE — TRANZIȚII PERMISE DE STATUS
# ============================================================
# Reflectă fluxul real al unei cereri:
#   PENDING ──(assign)──> ASSIGNED ──(start)──> IN_PROGRESS ──(finish)──> COMPLETED
#       │                    │                       │
#       └────────────────────┴───────────────────────┴──> CANCELLED (oricând înainte de COMPLETED)
ALLOWED_TRANSITIONS: dict[RequestStatus, set[RequestStatus]] = {
    RequestStatus.PENDING: {RequestStatus.ASSIGNED, RequestStatus.CANCELLED},
    RequestStatus.ASSIGNED: {RequestStatus.IN_PROGRESS, RequestStatus.PENDING, RequestStatus.CANCELLED},
    RequestStatus.IN_PROGRESS: {RequestStatus.COMPLETED, RequestStatus.CANCELLED},
    RequestStatus.COMPLETED: set(),  # finală
    RequestStatus.CANCELLED: set(),  # finală
}

# Tranziții pe care STAFF-ul le poate face (subset al celor de mai sus):
# staff-ul nu anulează și nu revine la PENDING — doar își execută munca.
STAFF_ALLOWED_TRANSITIONS: dict[RequestStatus, set[RequestStatus]] = {
    RequestStatus.ASSIGNED: {RequestStatus.IN_PROGRESS},
    RequestStatus.IN_PROGRESS: {RequestStatus.COMPLETED},
}

STATUS_LABELS = {
    RequestStatus.PENDING: "În așteptare",
    RequestStatus.ASSIGNED: "Asignată",
    RequestStatus.IN_PROGRESS: "În lucru",
    RequestStatus.COMPLETED: "Finalizată",
    RequestStatus.CANCELLED: "Anulată",
}

PRIORITY_LABELS = {
    "low": "Scăzută",
    "normal": "Normală",
    "urgent": "Urgentă",
}


# ============================================================
# HELPER pentru eager loading
# ============================================================
def _request_query(db: Session):
    """Query base pentru Request cu toate relațiile preîncărcate (evită N+1)."""
    return db.query(Request).options(
        joinedload(Request.guest),
        joinedload(Request.room),
        joinedload(Request.service_category),
        joinedload(Request.assigned_to),
    )


def _add_request_event(
    db: Session,
    request_id: int,
    actor_id: int | None,
    event_type: str,
    message: str,
) -> RequestEvent:
    event = RequestEvent(
        request_id=request_id,
        actor_id=actor_id,
        event_type=event_type,
        message=message,
    )
    db.add(event)
    return event


def _can_access_request(req: Request, user: User) -> bool:
    if user.role in (UserRole.RECEPTIONIST, UserRole.ADMIN):
        return True
    if user.role == UserRole.GUEST:
        return req.guest_id == user.id
    if user.role == UserRole.STAFF:
        return req.assigned_to_id == user.id
    return False


# ============================================================
# 1. POST /requests — Guest creează o cerere nouă
# ============================================================

@router.post(
    "",
    response_model=RequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new service request (guest only)",
)
def create_request(
    payload: RequestCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.GUEST))],
) -> Request:
    """
    Guest-ul trimite o cerere.

    `guest_id` și `room_id` sunt deduse automat din user-ul autentificat —
    NU le acceptăm din payload (prevenire IDOR).
    """
    # Guest-ul trebuie să fie cazat într-o cameră ca să poată face cereri.
    if current_user.room_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not assigned to a room. Please contact reception.",
        )

    # Validează că categoria există și e activă
    category = db.query(ServiceCategory).filter(
        ServiceCategory.id == payload.service_category_id
    ).first()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service category with id {payload.service_category_id} does not exist.",
        )
    if not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected service category is not currently available.",
        )

    new_request = Request(
        guest_id=current_user.id,
        room_id=current_user.room_id,
        service_category_id=payload.service_category_id,
        description=payload.description,
        priority=payload.priority,
        status=RequestStatus.PENDING,
    )
    db.add(new_request)
    db.flush()
    _add_request_event(
        db,
        new_request.id,
        current_user.id,
        "created",
        "Cererea a fost creată.",
    )
    db.commit()
    db.refresh(new_request)

    # Re-fetch cu eager loading ca relațiile să fie populate în răspuns
    return _request_query(db).filter(Request.id == new_request.id).first()


# ============================================================
# 2. GET /requests/me — Guest își vede propriile cereri
# ============================================================

@router.get(
    "/me",
    response_model=list[RequestResponse],
    summary="List my own requests (guest only)",
)
def list_my_requests(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.GUEST))],
    status_filter: Annotated[
        Optional[RequestStatus],
        Query(alias="status", description="Filter by status."),
    ] = None,
) -> list[Request]:
    """Guest-ul vede DOAR cererile pe care le-a trimis. Acoperă și history (toate statusurile)."""
    query = _request_query(db).filter(Request.guest_id == current_user.id)

    if status_filter is not None:
        query = query.filter(Request.status == status_filter)

    return query.order_by(Request.created_at.desc()).all()


# ============================================================
# 3. GET /requests — Recepție/Admin vede toate cererile
# ============================================================

@router.get(
    "",
    response_model=list[RequestResponse],
    summary="List all requests (receptionist + admin)",
)
def list_all_requests(
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[
        User,
        Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN)),
    ],
    status_filter: Annotated[
        Optional[RequestStatus],
        Query(alias="status", description="Filter by status."),
    ] = None,
    room_id: Annotated[
        Optional[int],
        Query(description="Filter by room."),
    ] = None,
) -> list[Request]:
    """
    Dashboard recepție: vede toate cererile, ordonate descrescător după dată.
    Filtrele opționale (`status`, `room_id`) ajută recepția să prioritizeze.
    """
    query = _request_query(db)

    if status_filter is not None:
        query = query.filter(Request.status == status_filter)
    if room_id is not None:
        query = query.filter(Request.room_id == room_id)

    return query.order_by(Request.created_at.desc()).all()


# ============================================================
# 4. GET /requests/assigned — Staff vede cererile alocate lui
# ============================================================

@router.get(
    "/assigned",
    response_model=list[RequestResponse],
    summary="List requests assigned to me (staff only)",
)
def list_assigned_requests(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.STAFF))],
    status_filter: Annotated[
        Optional[RequestStatus],
        Query(alias="status", description="Filter by status."),
    ] = None,
) -> list[Request]:
    """
    Staff-ul vede DOAR cererile alocate lui.
    Default: ordonat ascendent după dată (cele mai vechi primele = priority de execuție).
    """
    query = _request_query(db).filter(Request.assigned_to_id == current_user.id)

    if status_filter is not None:
        query = query.filter(Request.status == status_filter)

    return query.order_by(Request.created_at.asc()).all()


# ============================================================
# 5. PATCH /requests/{id}/assign — Recepție alocă unui staff
# ============================================================

@router.get(
    "/{request_id}",
    response_model=RequestResponse,
    summary="Get one request by id with role-based access",
)
def get_request(
    request_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
) -> Request:
    """Returneaza o cerere individuala, respectand accesul fiecarui rol."""
    req = _request_query(db).filter(Request.id == request_id).first()
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    if current_user.role == UserRole.GUEST and req.guest_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    if current_user.role == UserRole.STAFF and req.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    return req


@router.patch(
    "/{request_id}",
    response_model=RequestResponse,
    summary="Edit one of my pending requests (guest only)",
)
def update_my_request(
    request_id: int,
    payload: RequestUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.GUEST))],
) -> Request:
    """Guest-ul poate edita doar cererile proprii ramase in status PENDING."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if req is None or req.guest_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    if req.status != RequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending requests can be edited.",
        )

    category = db.query(ServiceCategory).filter(
        ServiceCategory.id == payload.service_category_id
    ).first()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service category with id {payload.service_category_id} does not exist.",
        )
    if not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected service category is not currently available.",
        )

    req.service_category_id = payload.service_category_id
    req.description = payload.description
    req.priority = payload.priority
    _add_request_event(db, req.id, current_user.id, "updated", "Cererea a fost actualizată.")
    db.commit()

    return _request_query(db).filter(Request.id == request_id).first()


@router.patch(
    "/{request_id}/cancel",
    response_model=RequestResponse,
    summary="Cancel one of my requests (guest only)",
)
def cancel_my_request(
    request_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.GUEST))],
) -> Request:
    """Guest-ul poate anula cererile proprii pana cand sunt in lucru."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if req is None or req.guest_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    if req.status not in (RequestStatus.PENDING, RequestStatus.ASSIGNED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending or assigned requests can be cancelled.",
        )

    req.status = RequestStatus.CANCELLED
    _add_request_event(db, req.id, current_user.id, "cancelled", "Cererea a fost anulată.")
    db.commit()

    return _request_query(db).filter(Request.id == request_id).first()


@router.patch(
    "/{request_id}/assign",
    response_model=RequestResponse,
    summary="Assign a request to a staff member (receptionist + admin)",
)
def assign_request(
    request_id: int,
    payload: RequestAssign,
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[
        User,
        Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN)),
    ],
) -> Request:
    """
    Alocă o cerere unui membru al staff-ului.

    Reguli:
    - Cererea trebuie să existe.
    - User-ul țintă trebuie să existe, să fie STAFF și activ.
    - Statusul curent trebuie să permită ASSIGN (adică PENDING; sau ASSIGNED — reasignare).
    """
    req = db.query(Request).filter(Request.id == request_id).first()
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    # Validare staff țintă
    target = db.query(User).filter(User.id == payload.assigned_to_id).first()
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {payload.assigned_to_id} not found.",
        )
    if target.role != UserRole.STAFF:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requests can only be assigned to users with role STAFF.",
        )
    if not target.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign requests to an inactive user.",
        )

    # Permitem assign din PENDING (alocare inițială) sau ASSIGNED (reasignare).
    # NU permitem assign pe cereri deja IN_PROGRESS / COMPLETED / CANCELLED.
    if req.status not in (RequestStatus.PENDING, RequestStatus.ASSIGNED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot assign a request with status '{req.status.value}'.",
        )

    req.assigned_to_id = target.id
    req.status = RequestStatus.ASSIGNED
    _add_request_event(
        db,
        req.id,
        _user.id,
        "assigned",
        f"Cererea a fost asignată către {target.full_name}.",
    )
    db.commit()

    return _request_query(db).filter(Request.id == request_id).first()


# ============================================================
# 6. PATCH /requests/{id}/status — Update status (Recepție + Staff)
# ============================================================

@router.patch(
    "/{request_id}/status",
    response_model=RequestResponse,
    summary="Update the status of a request (receptionist + staff)",
)
def update_request_status(
    request_id: int,
    payload: RequestStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
) -> Request:
    """
    Actualizează statusul unei cereri.

    Reguli per rol:
    - **Staff**: doar pe cererile alocate lor, doar tranzițiile ASSIGNED→IN_PROGRESS→COMPLETED.
    - **Receptionist / Admin**: orice cerere, orice tranziție validă (inclusiv CANCELLED).
    - **Guest**: nu poate modifica status-ul (folosește alte fluxuri).

    Setează automat `completed_at` când status-ul devine COMPLETED.
    """
    # Guest-ul nu poate folosi acest endpoint.
    if current_user.role == UserRole.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guests cannot update request status.",
        )

    req = db.query(Request).filter(Request.id == request_id).first()
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    new_status = payload.status
    current_status = req.status

    # Same-status update = no-op cu eroare clară (evită confuzia clientului)
    if new_status == current_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Request is already in status '{current_status.value}'.",
        )

    # Verificare 1: tranziția e validă în general?
    if new_status not in ALLOWED_TRANSITIONS.get(current_status, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Invalid status transition: {current_status.value} → {new_status.value}. "
                f"Allowed: {[s.value for s in ALLOWED_TRANSITIONS.get(current_status, set())]}."
            ),
        )

    # Verificare 2: dacă e STAFF, restricții suplimentare
    if current_user.role == UserRole.STAFF:
        # Trebuie să fie cererea LUI
        if req.assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update the status of requests assigned to you.",
            )
        # Și doar tranziții permise pentru staff
        staff_allowed = STAFF_ALLOWED_TRANSITIONS.get(current_status, set())
        if new_status not in staff_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Staff cannot perform transition {current_status.value} → {new_status.value}. "
                    f"Staff allowed: {[s.value for s in staff_allowed]}."
                ),
            )

    # Aplică schimbarea
    req.status = new_status
    if new_status == RequestStatus.COMPLETED:
        req.completed_at = datetime.now(timezone.utc)

    _add_request_event(
        db,
        req.id,
        current_user.id,
        "status",
        f"Statusul a fost schimbat din {STATUS_LABELS[current_status]} în {STATUS_LABELS[new_status]}.",
    )
    db.commit()
    return _request_query(db).filter(Request.id == request_id).first()


@router.patch(
    "/{request_id}/priority",
    response_model=RequestResponse,
    summary="Update request priority (receptionist + admin)",
)
def update_request_priority(
    request_id: int,
    payload: RequestPriorityUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.RECEPTIONIST, UserRole.ADMIN))],
) -> Request:
    req = db.query(Request).filter(Request.id == request_id).first()
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    old_priority = req.priority
    req.priority = payload.priority
    _add_request_event(
        db,
        req.id,
        current_user.id,
        "priority",
        (
            "Prioritatea a fost schimbată din "
            f"{PRIORITY_LABELS[old_priority.value]} în {PRIORITY_LABELS[payload.priority.value]}."
        ),
    )
    db.commit()
    return _request_query(db).filter(Request.id == request_id).first()


@router.get(
    "/{request_id}/comments",
    response_model=list[RequestCommentResponse],
    summary="List request comments",
)
def list_request_comments(
    request_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
) -> list[RequestComment]:
    req = db.query(Request).filter(Request.id == request_id).first()
    if req is None or not _can_access_request(req, current_user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    return (
        db.query(RequestComment)
        .options(joinedload(RequestComment.author))
        .filter(RequestComment.request_id == request_id)
        .order_by(RequestComment.created_at.asc())
        .all()
    )


@router.post(
    "/{request_id}/comments",
    response_model=RequestCommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a request comment",
)
def create_request_comment(
    request_id: int,
    payload: RequestCommentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
) -> RequestComment:
    req = db.query(Request).filter(Request.id == request_id).first()
    if req is None or not _can_access_request(req, current_user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    comment = RequestComment(
        request_id=request_id,
        author_id=current_user.id,
        body=payload.body,
    )
    db.add(comment)
    _add_request_event(db, request_id, current_user.id, "comment", "A fost adăugată o notă.")
    db.commit()
    db.refresh(comment)
    return (
        db.query(RequestComment)
        .options(joinedload(RequestComment.author))
        .filter(RequestComment.id == comment.id)
        .first()
    )


@router.get(
    "/{request_id}/events",
    response_model=list[RequestEventResponse],
    summary="List request timeline events",
)
def list_request_events(
    request_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
) -> list[RequestEvent]:
    req = db.query(Request).filter(Request.id == request_id).first()
    if req is None or not _can_access_request(req, current_user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request {request_id} not found.",
        )

    events = (
        db.query(RequestEvent)
        .options(joinedload(RequestEvent.actor))
        .filter(RequestEvent.request_id == request_id)
        .order_by(RequestEvent.created_at.asc())
        .all()
    )
    if events:
        return events

    _add_request_event(db, req.id, req.guest_id, "created", "Cererea a fost creată.")
    db.commit()
    return (
        db.query(RequestEvent)
        .options(joinedload(RequestEvent.actor))
        .filter(RequestEvent.request_id == request_id)
        .order_by(RequestEvent.created_at.asc())
        .all()
    )
