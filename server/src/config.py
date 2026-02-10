from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://audittrail:audittrail@db:5432/audittrail"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://audittrail:audittrail@db:5432/audittrail"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
