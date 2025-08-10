from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

from backend.core.security import security_manager


router = APIRouter()


class EphemeralKeyResponse(BaseModel):
    """Response model for ephemeral key generation"""
    key_id: str
    public_key: str
    expires_in_seconds: int
    algorithm: str = "RSA-2048"
    padding: str = "OAEP-SHA256"


@router.get("/ephemeral-key", response_model=EphemeralKeyResponse)
async def generate_ephemeral_key() -> EphemeralKeyResponse:
    """Generate a new ephemeral RSA key pair for secure password encryption.
    
    This endpoint generates a fresh RSA-2048 key pair for each request.
    The public key is returned to the client for encryption, while the 
    private key is stored temporarily server-side for decryption.
    
    The private key is automatically destroyed after use or expiration,
    providing perfect forward secrecy.
    
    Returns:
        EphemeralKeyResponse: Contains the public key and metadata
    """
    key_id, public_key_pem = security_manager.generate_ephemeral_rsa_keypair()
    
    return EphemeralKeyResponse(
        key_id=key_id,
        public_key=public_key_pem,
        expires_in_seconds=300,  # 5 minutes
        algorithm="RSA-2048",
        padding="OAEP-SHA256"
    )


@router.get("/stats")
async def get_crypto_stats() -> Dict[str, Any]:
    """Get statistics about ephemeral key usage (for debugging/monitoring)"""
    # Access the private ephemeral keys dict for stats
    ephemeral_keys = security_manager._ephemeral_keys
    
    return {
        "active_ephemeral_keys": len(ephemeral_keys),
        "key_ids": list(ephemeral_keys.keys()) if ephemeral_keys else [],
        "algorithm": "RSA-2048",
        "key_ttl_seconds": 300
    }
