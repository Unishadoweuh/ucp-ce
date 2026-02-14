"""Fernet-based secret encryption for sensitive configuration values.

Usage:
    # Generate a key (run once, store in ENCRYPTION_KEY env var):
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

    # Encrypt a value:
    from app.services.crypto import encrypt, decrypt
    encrypted = encrypt("my-secret-value")
    original = decrypt(encrypted)
"""

import os
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

# Try to use cryptography.fernet, fall back to base64 obfuscation if not available
try:
    from cryptography.fernet import Fernet, InvalidToken
    HAS_FERNET = True
except ImportError:
    HAS_FERNET = False
    logger.warning("cryptography package not installed — secrets will not be encrypted. Install with: pip install cryptography")


@lru_cache
def _get_fernet():
    """Get a Fernet instance using the ENCRYPTION_KEY env var."""
    key = os.environ.get("ENCRYPTION_KEY", "")
    if not key:
        logger.warning("ENCRYPTION_KEY not set — encryption disabled, values stored as plaintext")
        return None
    if not HAS_FERNET:
        return None
    try:
        return Fernet(key.encode())
    except Exception as e:
        logger.error(f"Invalid ENCRYPTION_KEY: {e}")
        return None


def encrypt(value: str) -> str:
    """Encrypt a string value. Returns encrypted string or original if encryption unavailable."""
    f = _get_fernet()
    if f is None:
        return value
    return f.encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    """Decrypt a string value. Returns original if decryption fails or unavailable."""
    f = _get_fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode()).decode()
    except Exception:
        # Value might not be encrypted (migration scenario)
        return value


def is_encrypted(value: str) -> bool:
    """Check if a value looks like it's Fernet-encrypted."""
    if not HAS_FERNET:
        return False
    try:
        # Fernet tokens start with 'gAAAAA'
        return value.startswith("gAAAAA") and len(value) > 40
    except Exception:
        return False
