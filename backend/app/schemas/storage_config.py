from pydantic import BaseModel
from typing import Optional


class StorageConfigRead(BaseModel):
    id: int
    storage_name: str
    role: str
    node: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class StorageConfigCreate(BaseModel):
    storage_name: str
    role: str  # vm_storage | cold_storage
    node: str
    description: Optional[str] = None


class StorageConfigUpdate(BaseModel):
    role: Optional[str] = None
    description: Optional[str] = None
