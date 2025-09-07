import os
import sys
import secrets
import keyring
from pathlib import Path
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.core import defaults


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
    """Provision and retrieve the application secret key from the OS keyring.

    Raises a clear, actionable error if no suitable keyring backend is available.
    """
    # Import-time safe override to avoid keyring in CI and other non-interactive envs
    env_secret = (
        os.getenv("SERO_SECURITY__SECRET_KEY")
        or os.getenv("SERO_SECRET_KEY")
    )
    if env_secret:
        return env_secret

    try:
        secret_key = keyring.get_password(
            defaults.KEYRING_SERVICE_NAME,
            defaults.KEYRING_KEY_NAME,
        )
    except keyring.errors.KeyringError as exc:
        # Provide platform-specific guidance to help users enable a real backend
        platform = sys.platform
        if platform.startswith("linux"):
            hint = (
                "No OS keyring backend detected. On Linux, install and run a Secret Service provider "
                "(e.g., GNOME Keyring or KWallet) and ensure a D-Bus session is active.\n"
                "- Python dependency 'secretstorage' is included automatically.\n"
                "- You still need a Secret Service daemon. Examples:\n"
                "  * Debian/Ubuntu: sudo apt-get install gnome-keyring\n"
                "  * Fedora:        sudo dnf install gnome-keyring\n"
                "  * Arch/Endeavour: sudo pacman -S gnome-keyring libsecret\n"
                "  * KDE:            install kwallet/kwalletmanager and ensure it runs in your session\n"
                "After installation, log out and back in (or start the keyring daemon), then retry."
            )
        elif platform == "win32":
            hint = (
                "Windows Credential Locker backend unavailable. Ensure you're running as a regular user "
                "(not elevated under a different profile) and that 'pywin32-ctypes' is installed."
            )
        elif platform == "darwin":
            hint = (
                "macOS Keychain backend unavailable. Ensure your Login keychain is unlocked "
                "(open Keychain Access) and retry."
            )
        else:
            hint = "No keyring backend available on this platform."
        raise RuntimeError(
            "Keyring backend not available: " + str(exc) + "\n" + hint,
        ) from exc

    if secret_key is None:
        secret_key = secrets.token_hex(32)
        try:
            keyring.set_password(
                defaults.KEYRING_SERVICE_NAME,
                defaults.KEYRING_KEY_NAME,
                secret_key,
            )
        except keyring.errors.KeyringError as exc:
            raise RuntimeError(
                "Failed to store secret key in OS keyring: " + str(exc),
            ) from exc

    return secret_key


class _LogSettings(BaseModel):
    filepath: Path = Field(default=defaults.LOG_FILE)
    level: str = Field(default="INFO")


class _DatabaseSettings(BaseModel):
    filepath: Path = Field(default=defaults.DB_FILE)
    # SQLite specific settings
    journal_mode: str = Field(default="WAL", description="SQLite journal mode (WAL recommended for concurrency)")
    synchronous: str = Field(default="NORMAL", description="SQLite synchronous mode")
    cache_size: int = Field(default=-64000, description="SQLite cache size in KB (negative value)")
    temp_store: str = Field(default="MEMORY", description="SQLite temporary storage location")


class _AiSettings(BaseModel):
    host: str = Field(default="http://localhost:11434")
    model: str = Field(default="llama2")
    timeout: int = Field(default=120)
    max_retries: int = Field(default=3)


class _SecuritySettings(BaseModel):
    secret_key: str = Field(default_factory=_materialize_secret_key_with_keyring)
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)


class _ProcessingSettings(BaseModel):
    dirpath: Path = Field(default=defaults.OUTPUT_DIR)
    max_file_size: int = Field(default=50 * 1024 * 1024)
    allowed_mime_types: list[str] = Field(default=['application/pdf'])


class _Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        env_prefix="SERO_",
    )

    default_origin: str = Field(default="http://localhost:8000")
    is_debug_mode: bool = Field(default=True)

    log: _LogSettings = Field(default_factory=_LogSettings)
    db: _DatabaseSettings = Field(default_factory=_DatabaseSettings)
    ai: _AiSettings = Field(default_factory=_AiSettings)
    security: _SecuritySettings = Field(default_factory=_SecuritySettings)
    processing: _ProcessingSettings = Field(default_factory=_ProcessingSettings)


# Singleton instance
settings = _Settings()
