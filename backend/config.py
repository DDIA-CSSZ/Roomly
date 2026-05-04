from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Setări încărcate din .env sau variabile de environment."""

    # Database
    DATABASE_URL: str = "mysql+pymysql://roomly_user:parola_sigura@localhost:3306/roomly_db?charset=utf8mb4"

    # JWT
    # IMPORTANT: generează o cheie reală cu: python -c "import secrets; print(secrets.token_urlsafe(32))"
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_use_secrets_token_urlsafe_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h pentru MVP, redu la 30-60 în producție

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # Seed defaults (folosite doar de seed.py)
    SEED_ADMIN_EMAIL: str = "admin@roomly.com"
    SEED_ADMIN_PASSWORD: str = "AdminParola123"
    SEED_DEFAULT_PASSWORD: str = "Parola123"   # parolă comună pentru ceilalți useri demo


settings = Settings()