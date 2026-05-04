from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import CurrentUser, require_role
from database import get_db
from models import ServiceCategory, UserRole
from schemas import ServiceCategoryCreate, ServiceCategoryResponse

router = APIRouter(prefix="/service-categories", tags=["Service Categories"])


# ============================================================
# LIST SERVICE CATEGORIES
# ============================================================

@router.get(
    "",
    response_model=list[ServiceCategoryResponse],
    summary="List all service categories",
)
def list_service_categories(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    include_inactive: Annotated[
        bool,
        Query(description="Include categories marked as inactive (admin only).")
    ] = False,
) -> list[ServiceCategory]:
    """
    Listează categoriile de servicii (Curățenie, Mentenanță, Room Service, etc.).

    Folosit de guest la dropdown-ul de pe formularul de creare cerere.
    """
    query = db.query(ServiceCategory)

    if include_inactive and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view inactive categories.",
        )

    if not include_inactive:
        query = query.filter(ServiceCategory.is_active == True)  # noqa: E712

    return query.order_by(ServiceCategory.name).all()


# ============================================================
# CREATE SERVICE CATEGORY (admin only)
# ============================================================

@router.post(
    "",
    response_model=ServiceCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service category (admin only)",
)
def create_service_category(
    payload: ServiceCategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[object, Depends(require_role(UserRole.ADMIN))],
) -> ServiceCategory:
    """Creează o categorie nouă. Necesită rol ADMIN."""
    existing = db.query(ServiceCategory).filter(
        ServiceCategory.name == payload.name
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A service category named '{payload.name}' already exists.",
        )

    new_category = ServiceCategory(
        name=payload.name,
        description=payload.description,
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category