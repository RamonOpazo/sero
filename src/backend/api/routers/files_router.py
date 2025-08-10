import base64
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.core.security import security_manager
from backend.api.schemas import files_schema, generics_schema
from backend.api.controllers import files_controller


router = APIRouter()


@router.get("/id/{file_id}", response_model=files_schema.File)
async def get_file(
    file_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get a single file by ID."""
    return files_controller.get(db=db, file_id=file_id)


@router.delete("/id/{file_id}", response_model=generics_schema.Success)
async def delete_file(
    file_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Delete a file by ID."""
    return files_controller.delete(db=db, file_id=file_id)


@router.post("/id/{file_id}/download", response_class=StreamingResponse)
async def download_file_secure(
    file_id: UUID,
    request: files_schema.EncryptedFileDownloadRequest,
    db: Session = Depends(get_db_session)
) -> StreamingResponse:
    """Securely download a file with RSA-encrypted password.
    
    This endpoint uses ephemeral RSA keys for maximum security:
    1. Client requests ephemeral public key from /crypto/ephemeral-key
    2. Client encrypts password with public key
    3. Client sends encrypted password + key_id in request body
    4. Server decrypts password with private key and immediately destroys it
    
    This provides perfect forward secrecy - even if the server is compromised,
    past file downloads remain secure.
    
    Args:
        file_id: UUID of the file to download
        request: Contains encrypted password and key metadata
        db: Database session
        
    Returns:
        StreamingResponse: The decrypted file as a stream
        
    Raises:
        HTTPException: If key is invalid/expired or decryption fails
    """
    # Decode the base64-encoded encrypted password
    try:
        encrypted_password_bytes = base64.b64decode(request.encrypted_password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64-encoded encrypted password: {e}"
        )
    
    # Decrypt the password using the ephemeral key
    decrypted_password = security_manager.decrypt_with_ephemeral_key(
        key_id=request.key_id,
        encrypted_data=encrypted_password_bytes
    )
    
    if decrypted_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to decrypt password. Key may be expired or invalid."
        )
    
    # Proceed with file download using decrypted password
    return files_controller.download(
        db=db,
        file_id=file_id, 
        password=decrypted_password,
        stream=request.stream
    )
