from pydantic import BaseModel


class EphemeralKeyResponse(BaseModel):
    """Response model for ephemeral key generation"""
    key_id: str
    public_key: str
    expires_in_seconds: int
    algorithm: str = "RSA-2048"
    padding: str = "OAEP-SHA256"
