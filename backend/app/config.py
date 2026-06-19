from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FindMyShot API"
    environment: str = "development"
    api_prefix: str = "/api"
    debug: bool = Field(default=True, validation_alias=AliasChoices("APP_DEBUG", "DEBUG"))

    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/findmyshot"
    )

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    pinecone_api_key: str = ""
    pinecone_index_name: str = "findmyshot-faces-dev"
    pinecone_namespace: str = "default"
    pinecone_index_host: str = ""
    pinecone_top_k: int = 30
    face_match_threshold: float = 0.45
    face_match_limit: int = 12

    storage_bucket_name: str = "findmyshot-dev"
    storage_region: str = "auto"
    storage_endpoint_url: str = ""
    storage_access_key: str = ""
    storage_secret_key: str = ""

    public_base_url: str = "http://localhost:3000"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "no-reply@findmyshot.app"
    smtp_from_name: str = "FindMyShot"
    smtp_use_tls: bool = True

    face_model_name: str = "buffalo_l"
    face_detection_size: int = 640
    face_provider: str = "CPUExecutionProvider"

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    cors_origin_regex: str = (
        r"^https?://("
        r"localhost|"
        r"127\.0\.0\.1|"
        r"0\.0\.0\.0|"
        r"192\.168\.\d+\.\d+|"
        r"10\.\d+\.\d+\.\d+|"
        r"172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+"
        r")(:\d+)?$"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
