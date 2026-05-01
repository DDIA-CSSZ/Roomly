from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from config import settings

# Format: mysql+pymysql://<user>:<password>@<host>:<port>/<database>?charset=utf8mb4
# IMPORTANT: în producție citește din variabile de environment (os.getenv) — nu hardcodat.
DATABASE_URL = "sqlite:///./roomly.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class pentru toate modelele ORM."""
    pass


def get_db():
    """Dependency injection pentru endpoint-urile FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()