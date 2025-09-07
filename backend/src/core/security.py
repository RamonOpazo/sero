import os
import re
import hashlib
import secrets
import base64
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from typing import Dict, Optional, Tuple
from loguru import logger

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status

from src.core.config import settings


class SecurityManager:
    def __init__(self):
        self.context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        # In-memory storage for ephemeral keys (key_id -> private_key_info)
        self._ephemeral_keys: Dict[str, Dict] = {}
    

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

    def generate_ephemeral_rsa_keypair(self) -> Tuple[str, str]:
        """Generate ephemeral RSA key pair and return (key_id, public_key_pem)"""
        # Clean up expired keys first
        self._cleanup_expired_keys()
        
        # Generate RSA key pair (2048-bit for good security/performance balance)
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        public_key = private_key.public_key()
        
        # Generate unique key ID
        key_id = str(uuid4())
        
        # Export public key to PEM format for frontend
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        
        # Store private key with metadata (TTL: 5 minutes)
        self._ephemeral_keys[key_id] = {
            'private_key': private_key,
            'created_at': datetime.utcnow(),
            'ttl_seconds': 300  # 5 minutes
        }
        
        logger.debug(f"Generated ephemeral RSA key pair: {key_id}")
        return key_id, public_pem
    
    def decrypt_with_ephemeral_key(self, key_id: str, encrypted_data: bytes) -> Optional[str]:
        """Decrypt data using ephemeral private key and immediately destroy the key"""
        key_info = self._ephemeral_keys.get(key_id)
        
        if not key_info:
            logger.warning(f"Ephemeral key not found or expired: {key_id}")
            return None
        
        # Check if key has expired
        created_at = key_info['created_at']
        ttl = key_info['ttl_seconds']
        if datetime.utcnow() > created_at + timedelta(seconds=ttl):
            logger.warning(f"Ephemeral key expired: {key_id}")
            self._ephemeral_keys.pop(key_id, None)
            return None
        
        try:
            # Decrypt the data
            private_key = key_info['private_key']
            decrypted_bytes = private_key.decrypt(
                encrypted_data,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            # Convert to string (assuming UTF-8 encoded password)
            decrypted_password = decrypted_bytes.decode('utf-8')
            
            logger.debug(f"Successfully decrypted data with ephemeral key: {key_id}")
            return decrypted_password
            
        except Exception as err:
            logger.error(f"Failed to decrypt with ephemeral key {key_id}: {err}")
            return None
        
        finally:
            # IMMEDIATELY destroy the private key for forward secrecy
            self._ephemeral_keys.pop(key_id, None)
            logger.debug(f"Destroyed ephemeral key: {key_id}")
    
    def _cleanup_expired_keys(self) -> None:
        """Remove expired ephemeral keys from memory"""
        now = datetime.utcnow()
        expired_keys = []
        
        for key_id, key_info in self._ephemeral_keys.items():
            created_at = key_info['created_at']
            ttl = key_info['ttl_seconds']
            if now > created_at + timedelta(seconds=ttl):
                expired_keys.append(key_id)
        
        for key_id in expired_keys:
            self._ephemeral_keys.pop(key_id, None)
            logger.debug(f"Cleaned up expired ephemeral key: {key_id}")
        
        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired ephemeral keys")


# Singleton instance
security_manager = SecurityManager()
