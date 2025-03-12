import os
import re
import bcrypt
import hashlib
import base64
from pydantic import validate_call
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from sero import types, consts


@validate_call
def html_color_to_rgb(value: types.HtmlColor) -> types.RGBFloatColor:
    match value:
        # Expand hex value of named color
        case v if v in consts.HTML_COLOR_NAMES.keys():
            _color = consts.HTML_COLOR_NAMES.get(value)
        # Expand shorthand hex (e.g., #rgb → #rrggbb)
        case v if re.match(r"^#[a-f0-9]{3}$", v):
            _color = "#" + "".join(c * 2 for c in value[1:])
        # Do nothing if already full hex
        case v if re.match(r"^#[a-f0-9]{6}$", v):
            _color = value
        case _:
            raise ValueError(f"Unrecognized color: {value}")
    
    # Convert hex to float RGB
    r, g, b = int(_color[1:3], 16), int(_color[3:5], 16), int(_color[5:7], 16)
    return (r/255.0, g/255.0, b/255.0)


@validate_call
def parse_page_ranges(value: types.CropPages) -> set[int] | None:
    if value == "all":
        return None
    
    numbers = set()

    for i in re.findall(r"[0-9]+:[0-9]+|[0-9]+", value):
        if ":" in i:
            start, end = map(int, i.split(":"))
            numbers.update(range(start, end + 1))
        else:
            numbers.add(int(i))

    return numbers


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
    expected_hashed_pw = bcrypt.hashpw(password.encode(), salt)  # Derive key again
    expected_key = expected_hashed_pw[:32]
    expected_hashed_data = hashlib.sha256(expected_key + data).digest()  # Hash data again

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

    # Use PKCS7 padding to pad the data to the block size (16 bytes for AES)
    padder = padding.PKCS7(128).padder()  # AES block size is 128 bits (16 bytes)
    padded_data = padder.update(data) + padder.finalize()

    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    return base64.b64encode(salt + iv + ciphertext)  # Store salt, IV, and ciphertext


def decrypt_data(password: str, encrypted_data: bytes) -> bytes:
    encrypted_data = base64.b64decode(encrypted_data)  # Decode from base64
    salt, iv, ciphertext = encrypted_data[:16], encrypted_data[16:32], encrypted_data[32:]

    key = derive_key(password, salt)  # Derive key from password
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()

    decrypted_padded = decryptor.update(ciphertext) + decryptor.finalize()

    # Use PKCS7 unpadding to remove padding
    unpadder = padding.PKCS7(128).unpadder()
    decrypted_data = unpadder.update(decrypted_padded) + unpadder.finalize()

    return decrypted_data
