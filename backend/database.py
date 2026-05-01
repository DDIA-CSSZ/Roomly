from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Format: mysql+pymysql://<user>:<password>@<host>:<port>/<database>?charset=utf8mb4
# IMPORTANT: în producție citește din variabile de environment (os.getenv) — nu hardcodat.
DATABASE_URL = "mysql+pymysql://roomly_user:parola_sigura@localhost:3306/roomly_db?charset=utf8mb4"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,    # validează conexiunea înainte de fiecare folosire (evită "MySQL server has gone away")
    pool_recycle=3600,     # reciclează conexiunile la 1h (MySQL închide default la 8h)
    pool_size=10,
    max_overflow=20,
    echo=False,            # True doar la debug — afișează SQL-ul generat
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