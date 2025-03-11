import os
import bcrypt
import hashlib
import base64
from pydantic import validate_call
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

from sero import types, consts


@validate_call
def html_to_rgb_float(color: types.HtmlColor) -> types.RGBFloatColor:
    
    def _enforce_hex(color: types.HtmlColor) -> types.HexColor:
        # Convert named colors to hex
        if isinstance(color, types.NamedColor):
            return consts.HTML_COLOR_NAMES[color]

        # Expand shorthand hex (e.g., #rgb → #rrggbb)
        if isinstance(color, types.HexColor) and len(color) == {4}:
            return "#" + "".join(c * 2 for c in color[1:])

        # In any other case, pydantic guarantees a correct hex color
        return color
    
    # Convert color to hex
    _color = _enforce_hex(color)

    # Convert hex to float RGB
    r, g, b = int(_color[1:3], 16), int(_color[3:5], 16), int(_color[5:7], 16)
    return (r/255.0, g/255.0, b/255.0)


@validate_call
def hash_data(password: str, data: bytes) -> bytes:
    salt = bcrypt.gensalt()  # Generate a new salt
    hashed_pw = bcrypt.hashpw(password.encode(), salt)  # Hash the password

    key = hashed_pw[:32]  # Use the first 32 bytes of bcrypt hash as a key
    hashed_data = hashlib.sha256(key + data).digest()  # Hash data with key

    return salt + hashed_data  # Store salt with the hash


@validate_call
def verify_hashed_data(password: str, data: bytes, stored_hash: bytes) -> bool:
    salt = stored_hash[:29]  # Extract bcrypt salt (bcrypt salts are 29 bytes long)
    expected_hashed_pw = bcrypt.hashpw(password.encode(), salt)[:32]  # Derive key again
    expected_hashed_data = hashlib.sha256(expected_hashed_pw + data).digest()  # Hash data again

    return stored_hash[29:] == expected_hashed_data  # Compare stored vs. computed hash


def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend(),
    )
    return kdf.derive(password.encode())

def encrypt_data(password: str, data: bytes) -> bytes:
    salt = os.urandom(16)  # Generate a random salt
    key = derive_key(password, salt)  # Derive encryption key
    iv = os.urandom(16)  # Generate IV for AES

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()

    # Pad data to be a multiple of 16 bytes (AES block size)
    padding_length = 16 - (len(data) % 16)
    padded_data = data + bytes([padding_length] * padding_length)

    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    return base64.b64encode(salt + iv + ciphertext)  # Store salt, IV, and ciphertext


def decrypt_data(password: str, encrypted_data: bytes) -> bytes:
    encrypted_data = base64.b64decode(encrypted_data)  # Decode from base64
    salt, iv, ciphertext = encrypted_data[:16], encrypted_data[16:32], encrypted_data[32:]

    key = derive_key(password, salt)  # Derive key from password
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()

    decrypted_padded = decryptor.update(ciphertext) + decryptor.finalize()

    # Remove padding
    padding_length = decrypted_padded[-1]
    return decrypted_padded[:-padding_length]
