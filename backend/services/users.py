from __future__ import annotations

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import User


async def get_or_create_user_by_clerk_id(session: Session, clerk_id: str) -> User:
    statement = select(User).where(User.clerk_id == clerk_id)
    db_user = (await session.exec(statement)).first()
    if not db_user:
        db_user = User(clerk_id=clerk_id)
        session.add(db_user)
        await session.commit()
        await session.refresh(db_user)
    return db_user
