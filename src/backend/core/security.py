import os
import re
import hashlib
import secrets
import base64
from datetime import datetime, timedelta, timezone
from loguru import logger

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status

from backend.core.config import settings


class SecurityManager:
    def __init__(self):
        self.context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    

    def generate_salt(self) -> bytes:
        return secrets.token_bytes(32)
    

    def derive_key(self, password: str, salt: bytes) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))
    

    def encrypt_data(self, data: bytes, password: str) -> tuple[bytes, bytes]:
        salt = self.generate_salt()
        key = self.derive_key(password, salt)
        fernet = Fernet(key)
        encrypted_data = fernet.encrypt(data)
        return encrypted_data, salt
    

    def decrypt_data(self, encrypted_data: bytes, password: str, salt: bytes) -> bytes | None:
        try:
            key = self.derive_key(password, salt)
            fernet = Fernet(key)
            return fernet.decrypt(encrypted_data)
        except Exception as err:
            logger.error(err)
            return None
    

    def hash_password(self, password: str) -> str:
        return self.context.hash(password)
    

    def verify_password(self, plain_password: str | bytes, hashed_password: str | bytes) -> bool:
        return self.context.verify(plain_password, hashed_password)
    

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        delta = expires_delta or timedelta(minutes=settings.security.access_token_expire_minutes)
        expire = datetime.now(timezone.utc) + delta
        to_encode = data.copy()
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            claims=to_encode,
            key=settings.security.secret_key,
            algorithm=settings.security.algorithm
        )
        return encoded_jwt
    

    def verify_token(self, token: str) -> dict:
        try:
            payload = jwt.decode(
                token=token,
                key=settings.security.secret_key,
                algorithms=[settings.security.algorithm]
            )
        
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

        return payload

    def generate_file_hash(self, file_data: bytes) -> str:
        return hashlib.sha256(file_data).hexdigest()


    def validate_file_size(self, file_size: int) -> bool:
        max_size = settings.processing.max_file_size
        return file_size <= max_size


    def validate_file_type(self, mime_type: str, file_data: bytes) -> bool:
        if mime_type not in settings.processing.allowed_mime_types:
            return False
        
        if mime_type == "application/pdf" and not file_data.startswith(b'%PDF-'):
            return False
            
        return True


    def sanitize_filename(self, filename: str) -> str:
        path, extension = os.path.splitext(filename.lower())
        name = os.path.basename(path)
        clean_name = re.sub(r'[^\w\-_]', '_', name)
        clean_name_length = len(clean_name)
        return clean_name[:min(clean_name_length, 255)] + extension


    def is_strong_password(self, password: str) -> bool:
        if len(password) < 8:
            return False
        
        if not re.search(r'[A-Z]', password):
            return False
        
        if not re.search(r'[a-z]', password):
            return False
        
        if not re.search(r'\d', password):
            return False
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False
        
        return True


# Singleton instance
security_manager = SecurityManager()
