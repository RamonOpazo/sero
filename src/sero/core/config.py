import os
import secrets
import keyring
from pathlib import Path
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from sero.core import defaults


def _materialize_secret_key() -> str:
    secret_key_path = defaults.BASE_PATH / ".secret_key"
    if secret_key_path.exists():
        return secret_key_path.read_text().strip()
    
    secret_key_path.parent.mkdir(parents=True, exist_ok=True)
    new_key = secrets.token_hex(32)
    secret_key_path.write_text(new_key)
    os.chmod(secret_key_path, 0o600)
    return new_key


def _materialize_secret_key_with_keyring() -> str:
    secret_key = keyring.get_password(defaults.KEYRING_SERVICE_NAME, defaults.KEYRING_KEY_NAME)

    if secret_key is None:
        secret_key = secrets.token_hex(32)
        keyring.set_password(defaults.KEYRING_SERVICE_NAME, defaults.KEYRING_KEY_NAME, secret_key)

    return secret_key


class _LogSettings(BaseModel):
    filepath: Path = Field(default=defaults.BASE_PATH / "logs/app.jsonl")
    level: str = Field(default="INFO")


class _DatabaseSettings(BaseModel):
    filepath: Path = Field(default=defaults.BASE_PATH / "sero.duckdb")
    memory_limit: str = Field(default="2GB", description="DuckDB memory limit")
    threads: int = Field(default=4, description="Number of threads for DuckDB")


class _AiSettings(BaseModel):
    host: str = Field(default="http://localhost:11434")
    model: str = Field(default="llama2")
    timeout: int = Field(default=120)
    max_retries: int = Field(default=3)


class _SecuritySettings(BaseModel):
    secret_key: str = Field(default_factory=_materialize_secret_key)
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)


class _ProcessingSettings(BaseModel):
    dirpath: Path = Field(default=defaults.BASE_PATH / "output")
    max_file_size: int = Field(default=50 * 1024 * 1024)
    allowed_mime_types: list[str] = Field(default=['application/pdf'])


class _Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", )

    default_origin: str = Field(default="http://localhost:8000")
    is_debug_mode: bool = Field(default=True)

    log: _LogSettings = Field(default_factory=_LogSettings)
    db: _DatabaseSettings = Field(default_factory=_DatabaseSettings)
    ai: _AiSettings = Field(default_factory=_AiSettings)
    security: _SecuritySettings = Field(default_factory=_SecuritySettings)
    processing: _ProcessingSettings = Field(default_factory=_ProcessingSettings)


# Singleton instance
settings = _Settings()
