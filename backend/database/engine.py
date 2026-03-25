"""
Async database engine — suporta SQLite (desenvolvimento) e PostgreSQL (produção).
A URL é lida de DATABASE_URL e convertida automaticamente para o driver async correto:
  sqlite:///./idealos.db  →  sqlite+aiosqlite:///./idealos.db
  postgresql://...         →  postgresql+asyncpg://...
  postgres://...           →  postgresql+asyncpg://...
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.pool import NullPool

_raw_url = os.getenv("DATABASE_URL", "sqlite:///./idealos.db")


def _make_async_url(url: str) -> str:
    """Converte URLs padrão para o formato de driver async do SQLAlchemy."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if url.startswith("sqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    return url


_async_url = _make_async_url(_raw_url)
IS_SQLITE = _async_url.startswith("sqlite")

if IS_SQLITE:
    # SQLite: NullPool evita conflito de thread; check_same_thread desabilitado para async
    engine: AsyncEngine = create_async_engine(
        _async_url,
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
        echo=False,
    )
else:
    # PostgreSQL: pool de conexões com health-check automático
    engine: AsyncEngine = create_async_engine(
        _async_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=False,
    )
