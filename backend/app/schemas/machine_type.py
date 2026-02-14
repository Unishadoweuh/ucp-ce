from pydantic import BaseModel
from typing import Optional


class MachineTypeRead(BaseModel):
    id: int
    name: str
    series: str
    vcpus: int
    memory_mb: int
    description: Optional[str] = None

    model_config = {"from_attributes": True}
