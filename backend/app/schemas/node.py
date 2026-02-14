from pydantic import BaseModel
from typing import List, Optional


class NodeRead(BaseModel):
    node: str
    status: str  # online | offline
    cpu: float  # usage ratio 0-1
    maxcpu: int
    mem: int
    maxmem: int
    disk: int
    maxdisk: int
    uptime: int


class NodeListResponse(BaseModel):
    nodes: List[NodeRead]
