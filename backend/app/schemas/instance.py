from pydantic import BaseModel
from typing import Optional, List


class InstanceDisk(BaseModel):
    storage: str = "local-lvm"
    size_gb: int = 32


class CreateInstanceRequest(BaseModel):
    name: str
    node: str  # Proxmox node → mapped as "region"
    machine_type: str  # e.g. "ucp-standard-2"
    template_vmid: int  # VMID of the template to clone
    boot_disk: InstanceDisk = InstanceDisk()
    additional_disks: List[InstanceDisk] = []
    start_after_create: bool = True
    description: Optional[str] = None
    tags: Optional[str] = None


class InstanceAction(BaseModel):
    action: str  # start | stop | shutdown | reset | suspend | resume


class InstanceRead(BaseModel):
    vmid: int
    name: str
    node: str
    status: str  # running | stopped | paused
    instance_type: str = "vm"
    vcpus: int
    memory_mb: int
    disk_gb: float
    uptime: int = 0
    tags: Optional[str] = None
    template: bool = False


class InstanceDetail(InstanceRead):
    pid: Optional[int] = None
    qmpstatus: Optional[str] = None
    agent: Optional[int] = None
    net0: Optional[str] = None
    ip_address: Optional[str] = None
