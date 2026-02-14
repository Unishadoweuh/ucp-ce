from pydantic import BaseModel
from typing import Optional


class LxcRead(BaseModel):
    vmid: int
    name: str
    node: str
    status: str  # running | stopped
    instance_type: str = "lxc"
    vcpus: int = 0
    memory_mb: int = 0
    disk_gb: float = 0
    uptime: int = 0
    tags: Optional[str] = None
    unprivileged: bool = True


class CreateLxcRequest(BaseModel):
    name: str
    node: str
    ostemplate: str  # e.g. "local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst"
    memory_mb: int = 512
    swap_mb: int = 512
    cores: int = 1
    disk_gb: int = 8
    storage: str = "local-lvm"
    net_bridge: str = "vmbr0"
    net_ip: str = "dhcp"  # "dhcp" or static like "10.0.0.5/24"
    net_gateway: Optional[str] = None
    unprivileged: bool = True
    start_after_create: bool = True
    description: Optional[str] = None
    tags: Optional[str] = None
    password: Optional[str] = None


class LxcAction(BaseModel):
    action: str  # start | stop | shutdown | reboot


class ResizeLxcRequest(BaseModel):
    cores: Optional[int] = None
    memory_mb: Optional[int] = None
