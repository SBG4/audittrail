import asyncio

from pwdlib import PasswordHash
from sqlalchemy import func, select

from src.database import async_session
from src.models.audit_type import AuditType
from src.models.jira_field_mapping import JiraFieldMapping
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

        # Seed default Jira field mappings
        default_jira_mappings: dict[str, list[tuple[str, str]]] = {
            "usb-usage": [
                ("Assignee", "user_name"),
                ("Summary", "serial_number"),
                ("Reporter", "user_id"),
            ],
            "email-usage": [
                ("Assignee", "account_owner"),
                ("Summary", "email_address"),
                ("Reporter", "account_owner"),
            ],
        }

        for slug, mappings in default_jira_mappings.items():
            # Find the audit type by slug
            result = await session.execute(
                select(AuditType).where(AuditType.slug == slug)
            )
            audit_type = result.scalar_one_or_none()
            if audit_type is None:
                print(f"Audit type '{slug}' not found, skipping Jira mappings")
                continue

            # Check if mappings already exist for this audit type
            count_result = await session.execute(
                select(func.count()).select_from(
                    select(JiraFieldMapping)
                    .where(JiraFieldMapping.audit_type_id == audit_type.id)
                    .subquery()
                )
            )
            existing_count = count_result.scalar() or 0

            if existing_count > 0:
                print(
                    f"Jira mappings for '{slug}' already exist ({existing_count}), skipping"
                )
                continue

            for jira_field, metadata_key in mappings:
                mapping = JiraFieldMapping(
                    audit_type_id=audit_type.id,
                    jira_field_name=jira_field,
                    case_metadata_key=metadata_key,
                )
                session.add(mapping)

            await session.commit()
            print(f"Seeded {len(mappings)} Jira field mappings for '{slug}'")


if __name__ == "__main__":
    asyncio.run(seed())
