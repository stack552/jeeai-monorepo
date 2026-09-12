# auth_utils.py
import os
import bcrypt
import secrets
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from jose import jwt, JWTError
from fastapi import Request

load_dotenv()  # reads JWT_SECRET_KEY from .env into environment variables

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24  # token valid for 24 hours

if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable not set. Check your .env file."
    )


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password for storage."""
    password_bytes = plain_password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plain-text password against a stored hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(user_id: int, email: str) -> str:
    """Create a signed JWT containing the user's id and email."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and verify a JWT. Returns the payload dict, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(request: Request) -> dict | None:
    """
    FastAPI dependency. Reads the access_token cookie, validates it,
    and returns {"id": ..., "email": ...} if valid — or None if there's
    no cookie, or it's invalid/expired. Never raises an error, so routes
    using this stay accessible to anonymous (logged-out) users too.
    """
    token = request.cookies.get("access_token")
    if not token:
        return None

    payload = decode_access_token(token)
    if payload is None:
        return None

    return {"id": int(payload["sub"]), "email": payload["email"]}


def generate_reset_token() -> str:
    """Generate a secure random token for password reset links."""
    return secrets.token_hex(32)