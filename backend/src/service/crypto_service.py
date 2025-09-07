from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional, Any
from pydantic import BaseModel

from src.core.security import security_manager


class EphemeralKey(BaseModel):
    key_id: str
    public_key: str
    expires_in_seconds: int = 300
    algorithm: str = "RSA-2048"
    padding: str = "OAEP-SHA256"


class SecurityService(ABC):
    @abstractmethod
    def generate_ephemeral_key(self) -> EphemeralKey:
        """Generate a new ephemeral RSA key pair and return public metadata."""
        raise NotImplementedError

    @abstractmethod
    def decrypt_with_ephemeral_key(self, *, key_id: str, encrypted_data: bytes) -> Optional[str]:
        """Decrypt with ephemeral key and destroy key; return plaintext or None."""
        raise NotImplementedError

    @abstractmethod
    def stats(self) -> dict[str, Any]:
        """Return debug/monitoring stats for ephemeral keys."""
        raise NotImplementedError

    @abstractmethod
    def cleanup(self) -> None:
        """Cleanup expired keys if any."""
        raise NotImplementedError


class SecurityManagerSecurityService(SecurityService):
    def generate_ephemeral_key(self) -> EphemeralKey:
        key_id, pem = security_manager.generate_ephemeral_rsa_keypair()
        return EphemeralKey(key_id=key_id, public_key=pem)

    def decrypt_with_ephemeral_key(self, *, key_id: str, encrypted_data: bytes) -> Optional[str]:
        return security_manager.decrypt_with_ephemeral_key(key_id=key_id, encrypted_data=encrypted_data)

    def stats(self) -> dict[str, Any]:
        ephemeral_keys = getattr(security_manager, "_ephemeral_keys", {})
        return {
            "active_ephemeral_keys": len(ephemeral_keys),
            "key_ids": list(ephemeral_keys.keys()) if ephemeral_keys else [],
            "algorithm": "RSA-2048",
            "key_ttl_seconds": 300,
        }

    def cleanup(self) -> None:
        security_manager._cleanup_expired_keys()


def get_security_service() -> SecurityService:
    return SecurityManagerSecurityService()
