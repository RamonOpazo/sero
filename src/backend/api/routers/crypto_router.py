from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

from backend.service.crypto_service import get_security_service


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
    svc = get_security_service()
    ek = svc.generate_ephemeral_key()
    return EphemeralKeyResponse(
        key_id=ek.key_id,
        public_key=ek.public_key,
        expires_in_seconds=ek.expires_in_seconds,
        algorithm=ek.algorithm,
        padding=ek.padding,
    )


@router.get("/stats")
async def get_crypto_stats() -> Dict[str, Any]:
    """Get statistics about ephemeral key usage (for debugging/monitoring)"""
    svc = get_security_service()
    return svc.stats()
