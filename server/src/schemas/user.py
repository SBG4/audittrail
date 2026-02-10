import uuid

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
