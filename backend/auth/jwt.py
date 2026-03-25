import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

_DEFAULT_SECRET = "idealos-neural-secret-change-in-production"
SECRET_KEY = os.getenv("SECRET_KEY", _DEFAULT_SECRET)

if SECRET_KEY == _DEFAULT_SECRET:
    logging.warning("AVISO: SECRET_KEY está usando o valor padrão inseguro. Defina SECRET_KEY no .env antes de ir para produção.")


def validate_secret_key() -> None:
    """Validate SECRET_KEY at application startup (not at import time).
    Call this from the FastAPI lifespan or startup event."""
    if SECRET_KEY == _DEFAULT_SECRET and os.getenv("ENVIRONMENT", "development") == "production":
        raise RuntimeError(
            "SECRET_KEY não pode ser o valor padrão em produção. "
            "Defina a variável de ambiente SECRET_KEY com um valor seguro."
        )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
