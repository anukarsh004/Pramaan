"""Explicit unit-of-work sessions; never connect at module import time."""

from collections.abc import AsyncIterator

from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.models.entities import Base


class Database:
    def __init__(self, url: str) -> None:
        self.engine = create_async_engine(url, pool_pre_ping=True)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def initialize(self) -> None:
        """Create all tables from the entity metadata.

        For SQLite dev mode this auto-creates tables.
        In production, Alembic migrations manage the schema.
        """
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self) -> None:
        await self.engine.dispose()


async def session_dependency(request: Request) -> AsyncIterator[AsyncSession]:
    database = getattr(request.app.state, "database", None)
    if not isinstance(database, Database):
        raise HTTPException(503)
    async with database.sessions() as session:
        async with session.begin():
            yield session
