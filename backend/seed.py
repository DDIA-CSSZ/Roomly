"""
Seed script pentru ROOMLY.

Rulare:
    python seed.py

Idempotent — poți rula de câte ori vrei, fără duplicate.

Populează:
    - 1 admin
    - 1 receptionist
    - 2 staff (housekeeping + maintenance)
    - 1 guest demo (alocat la camera 101)
    - 5 camere (101-105)
    - 4 categorii de servicii (Room Service, Housekeeping, Maintenance, Consumables)
"""

import logging
import sys

from sqlalchemy.orm import Session

from config import settings
from database import Base, SessionLocal, engine
from models import Room, ServiceCategory, User, UserRole
from security import hash_password

# Importurile cu efect secundar (înregistrare modele în Base.metadata)
import models  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("seed")


# ============================================================
# DATE DE SEED
# ============================================================

ROOMS_DATA = [
    {"room_number": "101", "floor": 1},
    {"room_number": "102", "floor": 1},
    {"room_number": "103", "floor": 1},
    {"room_number": "201", "floor": 2},
    {"room_number": "202", "floor": 2},
]

CATEGORIES_DATA = [
    {"name": "Room Service", "description": "Comenzi mâncare și băuturi în cameră"},
    {"name": "Housekeeping", "description": "Curățenie și schimbare lenjerie"},
    {"name": "Maintenance", "description": "Reparații și sesizări tehnice"},
    {"name": "Consumables", "description": "Cerere consumabile (prosoape, săpun, apă, etc.)"},
]

# Useri demo. Pentru admin folosim parola din .env; pentru ceilalți, parola default.
USERS_DATA = [
    {
        "email": settings.SEED_ADMIN_EMAIL,
        "full_name": "Elena Stoica (Admin)",
        "password": settings.SEED_ADMIN_PASSWORD,
        "role": UserRole.ADMIN,
        "room_number": None,
    },
    {
        "email": "ioana.marin@roomly.local",
        "full_name": "Ioana Marin (Receptionist)",
        "password": settings.SEED_DEFAULT_PASSWORD,
        "role": UserRole.RECEPTIONIST,
        "room_number": None,
    },
    {
        "email": "mihai.rusu@roomly.local",
        "full_name": "Mihai Rusu (Housekeeping)",
        "password": settings.SEED_DEFAULT_PASSWORD,
        "role": UserRole.STAFF,
        "room_number": None,
    },
    {
        "email": "radu.tehnic@roomly.local",
        "full_name": "Radu Popescu (Maintenance)",
        "password": settings.SEED_DEFAULT_PASSWORD,
        "role": UserRole.STAFF,
        "room_number": None,
    },
    {
        "email": "andrei.pop@example.com",
        "full_name": "Andrei Pop (Guest)",
        "password": settings.SEED_DEFAULT_PASSWORD,
        "role": UserRole.GUEST,
        "room_number": "101",   # cazat în camera 101
    },
]


# ============================================================
# HELPERS — fiecare returnează (entitatea, created_bool)
# ============================================================

def seed_room(db: Session, data: dict) -> tuple[Room, bool]:
    existing = db.query(Room).filter(Room.room_number == data["room_number"]).first()
    if existing:
        return existing, False
    room = Room(**data)
    db.add(room)
    db.flush()   # avem nevoie de room.id înainte de commit (pentru guest-ul demo)
    return room, True


def seed_category(db: Session, data: dict) -> tuple[ServiceCategory, bool]:
    existing = db.query(ServiceCategory).filter(ServiceCategory.name == data["name"]).first()
    if existing:
        return existing, False
    category = ServiceCategory(**data)
    db.add(category)
    db.flush()
    return category, True


def seed_user(db: Session, data: dict, rooms_by_number: dict[str, Room]) -> tuple[User, bool]:
    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        return existing, False

    room_id = None
    if data["room_number"] is not None:
        room = rooms_by_number.get(data["room_number"])
        if room is None:
            logger.warning(
                f"Camera {data['room_number']} nu există pentru user-ul {data['email']}. "
                f"Userul va fi creat fără cameră."
            )
        else:
            room_id = room.id

    user = User(
        email=data["email"],
        full_name=data["full_name"],
        hashed_password=hash_password(data["password"]),
        role=data["role"],
        room_id=room_id,
    )
    db.add(user)
    db.flush()
    return user, True


# ============================================================
# MAIN
# ============================================================

def run_seed() -> None:
    logger.info("Asigurăm că tabelele există...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # --- ROOMS ---
        logger.info("Seeding rooms...")
        rooms_by_number: dict[str, Room] = {}
        rooms_created = 0
        for data in ROOMS_DATA:
            room, created = seed_room(db, data)
            rooms_by_number[room.room_number] = room
            if created:
                rooms_created += 1
        logger.info(f"  Rooms: {rooms_created} create, {len(ROOMS_DATA) - rooms_created} deja existente.")

        # --- SERVICE CATEGORIES ---
        logger.info("Seeding service categories...")
        categories_created = 0
        for data in CATEGORIES_DATA:
            _, created = seed_category(db, data)
            if created:
                categories_created += 1
        logger.info(
            f"  Categories: {categories_created} create, "
            f"{len(CATEGORIES_DATA) - categories_created} deja existente."
        )

        # --- USERS ---
        logger.info("Seeding users...")
        users_created = 0
        for data in USERS_DATA:
            _, created = seed_user(db, data, rooms_by_number)
            if created:
                users_created += 1
        logger.info(f"  Users: {users_created} creați, {len(USERS_DATA) - users_created} deja existenți.")

        # Commit unic la final — fie totul, fie nimic.
        db.commit()
        logger.info("Seed finalizat cu succes.")

        # --- SUMAR CREDENȚIALE ---
        print("\n" + "=" * 60)
        print("CREDENȚIALE DE TEST")
        print("=" * 60)
        print(f"{'Rol':<15} {'Email':<35} {'Parolă'}")
        print("-" * 60)
        for u in USERS_DATA:
            print(f"{u['role'].value:<15} {u['email']:<35} {u['password']}")
        print("=" * 60)
        print("Pornește serverul cu: uvicorn main:app --reload")
        print("Swagger UI:           http://localhost:8000/docs")
        print("=" * 60 + "\n")

    except Exception as e:
        db.rollback()
        logger.error(f"Seed eșuat, rollback aplicat: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        run_seed()
    except Exception:
        sys.exit(1)