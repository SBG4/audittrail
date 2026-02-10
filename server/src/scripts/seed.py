import asyncio

from pwdlib import PasswordHash
from sqlalchemy import select

from src.database import async_session
from src.models.audit_type import AuditType
from src.models.user import User

USB_USAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "serial_number": {"type": "string", "title": "S/N"},
        "user_name": {"type": "string", "title": "User Name"},
        "user_id": {"type": "string", "title": "User ID"},
        "computer_used": {"type": "string", "title": "Computer Used"},
    },
    "required": ["serial_number", "user_name", "user_id", "computer_used"],
}

EMAIL_USAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "email_address": {"type": "string", "title": "Email Address"},
        "email_server": {"type": "string", "title": "Email Server"},
        "account_owner": {"type": "string", "title": "Account Owner"},
        "department": {"type": "string", "title": "Department"},
    },
    "required": ["email_address", "account_owner"],
}

AUDIT_TYPES = [
    {
        "name": "USB Usage",
        "slug": "usb-usage",
        "description": "Audit of USB device usage and data transfers",
        "schema": USB_USAGE_SCHEMA,
    },
    {
        "name": "Email Usage",
        "slug": "email-usage",
        "description": "Audit of email account usage and communications",
        "schema": EMAIL_USAGE_SCHEMA,
    },
]


async def seed() -> None:
    async with async_session() as session:
        # Seed admin user
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

        # Seed audit types
        for audit_type_data in AUDIT_TYPES:
            result = await session.execute(
                select(AuditType).where(AuditType.slug == audit_type_data["slug"])
            )
            if result.scalar_one_or_none() is None:
                audit_type = AuditType(**audit_type_data)
                session.add(audit_type)
                await session.commit()
                print(f"Seeded audit type: {audit_type_data['name']}")
            else:
                print(
                    f"Audit type '{audit_type_data['name']}' already exists, skipping"
                )


if __name__ == "__main__":
    asyncio.run(seed())
