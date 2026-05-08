"""Configuration parsing for the archive API."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    database_path: Path = Field(default=Path("/data/xfiles.sqlite3"))
    storage_dir: Path = Field(default=Path("/data/files"))
    release_url: str = "https://www.war.gov/UFO/"
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://localhost:8080",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8080",
        ]
    )
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"
    max_download_bytes: int = 1_000_000_000

    model_config = SettingsConfigDict(env_prefix="XFILES_", env_nested_delimiter="__")


class ConfigLoader:
    """Loads typed runtime settings from the process environment."""

    def load(self) -> Settings:
        """Return validated runtime settings."""
        return Settings()
