from fastapi import APIRouter
from typing import Dict, Any

from backend.api.schemas import security_schema
from backend.service.crypto_service import get_security_service


router = APIRouter()



@router.get("/ephemeral-key", response_model=security_schema.EphemeralKeyResponse)
async def generate_ephemeral_key() -> security_schema.EphemeralKeyResponse:
    """Generate a new ephemeral RSA key pair for secure password encryption."""
    svc = get_security_service()
    ek = svc.generate_ephemeral_key()
    return security_schema.EphemeralKeyResponse(
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
