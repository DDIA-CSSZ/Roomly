import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import auth_router, rooms_router, service_categories_router, requests_router

# Importăm toate modelele înainte de create_all,
# pentru ca SQLAlchemy să le înregistreze în Base.metadata.
import models  # noqa: F401  (import cu efect secundar)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ============================================================
# LIFESPAN — startup & shutdown hooks
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    logger.info("Starting ROOMLY backend...")
    logger.info("Creating database tables (if not present)...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables ready.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    yield  # === aplicația rulează între yield și ieșirea din funcție ===

    # --- SHUTDOWN ---
    logger.info("Shutting down ROOMLY backend...")
    engine.dispose()
    logger.info("Database connections closed.")


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="ROOMLY API",
    description="Hotel service request management platform — MVP backend.",
    version="0.1.0",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================
# Listă explicită de origini permise (frontend-ul React).
# IMPORTANT: NU folosim "*" cu allow_credentials=True — combinația e blocată de browser.
ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite dev server (default)
    "http://localhost:3000",   # Create React App (default)
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTERS
# ============================================================

app.include_router(auth_router.router)
app.include_router(rooms_router.router)
app.include_router(service_categories_router.router)
app.include_router(requests_router.router)

# ============================================================
# ROOT / HEALTH CHECK
# ============================================================

@app.get("/", tags=["Health"])
def root():
    return {
        "service": "ROOMLY API",
        "version": "0.1.0",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint simplu pentru monitoring / load balancer."""
    return {"status": "ok"}