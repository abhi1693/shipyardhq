from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from settings import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url

_POSTGRES_DIALECTS = ("postgresql",)


def _validate_database_url(database_url: str) -> None:
    scheme = database_url.split("://", 1)[0]
    if not scheme.startswith(_POSTGRES_DIALECTS):
        raise RuntimeError(f"Only PostgreSQL is supported. Got '{scheme}'.")


def _build_sync_url(database_url: str) -> str:
    scheme, rest = database_url.split("://", 1)
    if scheme in _POSTGRES_DIALECTS:
        return f"postgresql+psycopg://{rest}"
    return database_url


def _build_async_url(database_url: str) -> str:
    return _build_sync_url(database_url)


def _build_engine():
    _validate_database_url(DATABASE_URL)
    sync_url = _build_sync_url(DATABASE_URL)
    engine_kwargs = {
        "echo": False,
        "pool_pre_ping": settings.db_pool_pre_ping,
        "pool_recycle": settings.db_pool_recycle_seconds,
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_timeout": settings.db_pool_timeout_seconds,
    }
    return create_engine(sync_url, **engine_kwargs)


def _build_async_engine():
    async_url = _build_async_url(DATABASE_URL)
    engine_kwargs = {
        "echo": False,
        "pool_pre_ping": settings.db_pool_pre_ping,
        "pool_recycle": settings.db_pool_recycle_seconds,
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_timeout": settings.db_pool_timeout_seconds,
    }
    return create_async_engine(async_url, **engine_kwargs)


sync_engine = _build_engine()
async_engine = _build_async_engine()


async def init_db() -> None:
    import models

    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async_session = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session():
    async with async_session() as session:
        yield session
