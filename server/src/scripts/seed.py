import asyncio

from pwdlib import PasswordHash
from sqlalchemy import select

from src.database import async_session
from src.models.user import User


async def seed() -> None:
    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.username == "admin")
        )
        if result.scalar_one_or_none() is None:
            ph = PasswordHash.recommended()
            admin = User(
                username="admin",
                hashed_password=ph.hash("changeme"),
                full_name="Default Admin",
            )
            session.add(admin)
            await session.commit()
            print("Seeded default admin user")
        else:
            print("Admin user already exists, skipping seed")


if __name__ == "__main__":
    asyncio.run(seed())
