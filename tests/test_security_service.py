import base64
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding

from backend.service.crypto_service import get_security_service
from backend.core.security import security_manager


class TestSecurityService:
    """Service-focused tests for ephemeral RSA key workflow via SecurityService."""

    def test_generate_ephemeral_key_metadata_and_pem(self):
        svc = get_security_service()
        ek = svc.generate_ephemeral_key()
        # metadata
        assert len(ek.key_id) == 36 and ek.algorithm == "RSA-2048" and ek.padding == "OAEP-SHA256"
        # parse PEM
        public_key = serialization.load_pem_public_key(ek.public_key.encode("utf-8"))
        assert getattr(public_key, "key_size", 2048) == 2048
    
    def test_stats_reflects_active_keys(self):
        svc = get_security_service()
        ek = svc.generate_ephemeral_key()
        stats = svc.stats()
        assert ek.key_id in stats.get("key_ids", []) and stats.get("active_ephemeral_keys", 0) >= 1
    
    def test_multiple_ephemeral_keys(self):
        svc = get_security_service()
        keys = [svc.generate_ephemeral_key() for _ in range(3)]
        key_ids = [k.key_id for k in keys]
        assert len(set(key_ids)) == 3
        stats = svc.stats()
        for kid in key_ids:
            assert kid in stats.get("key_ids", [])
    
    def test_rsa_encryption_decryption_workflow(self):
        svc = get_security_service()
        ek = svc.generate_ephemeral_key()
        public_key = serialization.load_pem_public_key(ek.public_key.encode("utf-8"))
        test_password = "test_secure_password_123!@#"
        encrypted_bytes = public_key.encrypt(
            test_password.encode("utf-8"),
            padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
        )
        decrypted_password = svc.decrypt_with_ephemeral_key(key_id=ek.key_id, encrypted_data=encrypted_bytes)
        assert decrypted_password == test_password
        # key should be destroyed
        assert ek.key_id not in svc.stats().get("key_ids", [])
    
    def test_key_expiration_cleanup(self):
        svc = get_security_service()
        ek = svc.generate_ephemeral_key()
        # Manually expire
        from datetime import datetime, timedelta
        security_manager._ephemeral_keys[ek.key_id]["created_at"] = datetime.utcnow() - timedelta(seconds=400)
        # Trigger cleanup by calling stats (or explicit cleanup)
        svc.cleanup()
        stats = svc.stats()
        assert ek.key_id not in stats.get("key_ids", [])
    
    def test_invalid_key_decryption(self):
        svc = get_security_service()
        fake_encrypted_data = base64.b64encode(b"fake_data").decode("utf-8")
        result = svc.decrypt_with_ephemeral_key(key_id="non-existent-key-id", encrypted_data=base64.b64decode(fake_encrypted_data))
        assert result is None
    
    def test_malformed_encrypted_data(self):
        svc = get_security_service()
        ek = svc.generate_ephemeral_key()
        malformed_data = b"this_is_not_encrypted_data"
        result = svc.decrypt_with_ephemeral_key(key_id=ek.key_id, encrypted_data=malformed_data)
        assert result is None
        assert ek.key_id not in svc.stats().get("key_ids", [])
    
    def test_concurrent_key_generation(self):
        """Test concurrent key generation (simulates multiple threads)"""
        import concurrent.futures
        svc = get_security_service()
        def generate_key():
            return svc.generate_ephemeral_key()
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(generate_key) for _ in range(10)]
            keys = [future.result() for future in concurrent.futures.as_completed(futures)]
        key_ids = [k.key_id for k in keys]
        assert len(set(key_ids)) == 10
        stats = svc.stats()
        for kid in key_ids:
            assert kid in stats.get("key_ids", [])
