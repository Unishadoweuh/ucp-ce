from pydantic import BaseModel
from typing import List


class ClusterStats(BaseModel):
    total_vms: int
    running_vms: int
    stopped_vms: int
    total_vcpus_used: int
    total_memory_used_mb: int
    total_memory_max_mb: int
    total_disk_used_gb: float
    total_disk_max_gb: float
    nodes_online: int
    nodes_total: int


class NodeSummary(BaseModel):
    node: str
    status: str
    cpu_usage: float
    memory_used_mb: int
    memory_max_mb: int
    vm_count: int


class DashboardResponse(BaseModel):
    cluster: ClusterStats
    nodes: List[NodeSummary]
