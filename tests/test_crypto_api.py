"""
Tests for the RSA ephemeral key crypto API endpoints.

This module tests the complete crypto workflow:
1. Generating ephemeral RSA key pairs
2. Encrypting passwords with public keys
3. Decrypting passwords with private keys (via file download)
4. Key cleanup and expiration
"""
import base64
import pytest
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding

from backend.app import app
from backend.core.security import security_manager


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


class TestCryptoAPI:
    """Test suite for crypto API endpoints"""
    
    def test_generate_ephemeral_key(self, client):
        """Test ephemeral key generation endpoint"""
        response = client.get("/api/crypto/ephemeral-key")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "key_id" in data
        assert "public_key" in data
        assert "expires_in_seconds" in data
        assert "algorithm" in data
        assert "padding" in data
        
        # Verify expected values
        assert data["algorithm"] == "RSA-2048"
        assert data["padding"] == "OAEP-SHA256"
        assert data["expires_in_seconds"] == 300
        
        # Verify key_id is a valid UUID-like string
        assert isinstance(data["key_id"], str)
        assert len(data["key_id"]) == 36  # UUID4 length
        assert data["key_id"].count("-") == 4
        
        # Verify public key is valid PEM
        assert data["public_key"].startswith("-----BEGIN PUBLIC KEY-----")
        assert data["public_key"].endswith("-----END PUBLIC KEY-----\n")
        
        # Verify we can parse the public key
        public_key = serialization.load_pem_public_key(
            data["public_key"].encode('utf-8')
        )
        assert public_key.key_size == 2048
    
    def test_crypto_stats(self, client):
        """Test crypto statistics endpoint"""
        # Generate a key first
        response = client.get("/api/crypto/ephemeral-key")
        assert response.status_code == 200
        key_data = response.json()
        
        # Check stats
        stats_response = client.get("/api/crypto/stats")
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        # Verify stats structure
        assert "active_ephemeral_keys" in stats
        assert "key_ids" in stats
        assert "algorithm" in stats
        assert "key_ttl_seconds" in stats
        
        # Verify values
        assert stats["active_ephemeral_keys"] >= 1
        assert key_data["key_id"] in stats["key_ids"]
        assert stats["algorithm"] == "RSA-2048"
        assert stats["key_ttl_seconds"] == 300
    
    def test_multiple_ephemeral_keys(self, client):
        """Test generating multiple ephemeral keys"""
        keys = []
        
        # Generate multiple keys
        for i in range(3):
            response = client.get("/api/crypto/ephemeral-key")
            assert response.status_code == 200
            keys.append(response.json())
        
        # Verify all keys are unique
        key_ids = [key["key_id"] for key in keys]
        assert len(set(key_ids)) == 3  # All unique
        
        # Verify all keys are active
        stats_response = client.get("/api/crypto/stats")
        stats = stats_response.json()
        
        for key_id in key_ids:
            assert key_id in stats["key_ids"]
    
    def test_rsa_encryption_decryption_workflow(self, client):
        """Test the complete RSA encryption/decryption workflow"""
        # Step 1: Get ephemeral key
        response = client.get("/api/crypto/ephemeral-key")
        assert response.status_code == 200
        key_data = response.json()
        
        # Step 2: Parse public key
        public_key = serialization.load_pem_public_key(
            key_data["public_key"].encode('utf-8')
        )
        
        # Step 3: Encrypt test password
        test_password = "test_secure_password_123!@#"
        encrypted_bytes = public_key.encrypt(
            test_password.encode('utf-8'),
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        encrypted_b64 = base64.b64encode(encrypted_bytes).decode('utf-8')
        
        # Step 4: Test decryption through security manager
        decrypted_password = security_manager.decrypt_with_ephemeral_key(
            key_id=key_data["key_id"],
            encrypted_data=encrypted_bytes
        )
        
        # Verify successful decryption
        assert decrypted_password == test_password
        
        # Step 5: Verify key was destroyed after use
        stats_response = client.get("/api/crypto/stats")
        stats = stats_response.json()
        assert key_data["key_id"] not in stats["key_ids"]
    
    def test_key_expiration_cleanup(self, client):
        """Test that expired keys are cleaned up"""
        # Generate a key
        response = client.get("/api/crypto/ephemeral-key")
        assert response.status_code == 200
        key_data = response.json()
        
        # Manually expire the key by setting its creation time to the past
        key_info = security_manager._ephemeral_keys[key_data["key_id"]]
        from datetime import datetime, timedelta
        key_info["created_at"] = datetime.utcnow() - timedelta(seconds=400)  # Expired
        
        # Generate another key, which should trigger cleanup
        response = client.get("/api/crypto/ephemeral-key")
        assert response.status_code == 200
        new_key_data = response.json()
        
        # Check that old key was cleaned up
        stats_response = client.get("/api/crypto/stats")
        stats = stats_response.json()
        
        assert key_data["key_id"] not in stats["key_ids"]
        assert new_key_data["key_id"] in stats["key_ids"]
    
    def test_invalid_key_decryption(self, client):
        """Test decryption with invalid/non-existent key"""
        fake_encrypted_data = base64.b64encode(b"fake_data").decode('utf-8')
        
        # Try to decrypt with non-existent key
        result = security_manager.decrypt_with_ephemeral_key(
            key_id="non-existent-key-id",
            encrypted_data=base64.b64decode(fake_encrypted_data)
        )
        
        assert result is None
    
    def test_malformed_encrypted_data(self, client):
        """Test decryption with malformed encrypted data"""
        # Generate a valid key
        response = client.get("/api/crypto/ephemeral-key")
        assert response.status_code == 200
        key_data = response.json()
        
        # Try to decrypt malformed data
        malformed_data = b"this_is_not_encrypted_data"
        result = security_manager.decrypt_with_ephemeral_key(
            key_id=key_data["key_id"],
            encrypted_data=malformed_data
        )
        
        assert result is None
        
        # Verify key was still destroyed even though decryption failed
        stats_response = client.get("/api/crypto/stats")
        stats = stats_response.json()
        assert key_data["key_id"] not in stats["key_ids"]
    
    def test_concurrent_key_generation(self, client):
        """Test concurrent key generation (simulates multiple users)"""
        import concurrent.futures
        import threading
        
        def generate_key():
            # Each thread gets its own test client
            with TestClient(app) as thread_client:
                response = thread_client.get("/api/crypto/ephemeral-key")
                assert response.status_code == 200
                return response.json()
        
        # Generate keys concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(generate_key) for _ in range(10)]
            keys = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Verify all keys are unique
        key_ids = [key["key_id"] for key in keys]
        assert len(set(key_ids)) == 10  # All unique
        
        # Verify algorithm and settings are consistent
        for key in keys:
            assert key["algorithm"] == "RSA-2048"
            assert key["expires_in_seconds"] == 300


class TestSecurityManager:
    """Test suite for SecurityManager crypto methods"""
    
    def test_generate_ephemeral_rsa_keypair(self):
        """Test RSA key pair generation"""
        key_id, public_key_pem = security_manager.generate_ephemeral_rsa_keypair()
        
        # Verify key_id format
        assert isinstance(key_id, str)
        assert len(key_id) == 36  # UUID4 length
        
        # Verify public key format
        assert public_key_pem.startswith("-----BEGIN PUBLIC KEY-----")
        assert public_key_pem.endswith("-----END PUBLIC KEY-----\n")
        
        # Verify we can parse the key
        public_key = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
        assert public_key.key_size == 2048
        
        # Verify key is stored in manager
        assert key_id in security_manager._ephemeral_keys
        
        # Cleanup
        security_manager._ephemeral_keys.pop(key_id, None)
    
    def test_cleanup_expired_keys(self):
        """Test expired key cleanup"""
        from datetime import datetime, timedelta
        
        # Generate some keys with different creation times
        key_id1, _ = security_manager.generate_ephemeral_rsa_keypair()
        key_id2, _ = security_manager.generate_ephemeral_rsa_keypair()
        key_id3, _ = security_manager.generate_ephemeral_rsa_keypair()
        
        # Manually expire two keys
        security_manager._ephemeral_keys[key_id1]["created_at"] = datetime.utcnow() - timedelta(seconds=400)
        security_manager._ephemeral_keys[key_id2]["created_at"] = datetime.utcnow() - timedelta(seconds=350)
        # key_id3 remains fresh
        
        # Trigger cleanup
        security_manager._cleanup_expired_keys()
        
        # Verify expired keys were removed
        assert key_id1 not in security_manager._ephemeral_keys
        assert key_id2 not in security_manager._ephemeral_keys
        assert key_id3 in security_manager._ephemeral_keys
        
        # Cleanup remaining key
        security_manager._ephemeral_keys.pop(key_id3, None)
