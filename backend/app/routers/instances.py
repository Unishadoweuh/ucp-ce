"""Instances router — list, create, action, delete VMs with ownership & quotas."""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.schemas.instance import (
    CreateInstanceRequest,
    InstanceAction,
    InstanceRead,
)
from app.models.machine_type import MachineType
from app.models.user import User
from app.database import get_db
from app.services import proxmox
from app.services.auth import get_current_user

router = APIRouter(prefix="/instances", tags=["Instances"])
limiter = Limiter(key_func=get_remote_address)

OWNER_TAG_PREFIX = "ucp-owner:"


def _vm_to_read(vm: dict) -> InstanceRead:
    """Map Proxmox VM dict to InstanceRead schema."""
    maxdisk = vm.get("maxdisk", 0)
    disk_gb = round(maxdisk / (1024**3), 1) if maxdisk else 0
    return InstanceRead(
        vmid=vm.get("vmid", 0),
        name=vm.get("name", f"vm-{vm.get('vmid', '?')}"),
        node=vm.get("node", ""),
        status=vm.get("status", "unknown"),
        vcpus=vm.get("cpus", 0) or vm.get("maxcpu", 0) or vm.get("cores", 0) or 0,
        memory_mb=round((vm.get("maxmem", 0) or vm.get("memory", 0)) / (1024**2)) if vm.get("maxmem", 0) > 1024 else vm.get("maxmem", 0) or vm.get("memory", 0),
        disk_gb=disk_gb,
        uptime=vm.get("uptime", 0),
        tags=vm.get("tags", ""),
        template=bool(vm.get("template", 0)),
    )


def _is_owner(vm: dict, user_id: int) -> bool:
    """Check if a VM belongs to a user via tags."""
    tags = vm.get("tags", "") or ""
    return f"{OWNER_TAG_PREFIX}{user_id}" in tags


def _get_user_vms(all_vms: list, user: User) -> list:
    """Filter VMs by ownership. Admin sees all, user sees own."""
    non_templates = [v for v in all_vms if not v.get("template", 0)]
    if user.role == "admin":
        return non_templates
    return [v for v in non_templates if _is_owner(v, user.id)]


@router.get("", response_model=List[InstanceRead])
async def list_instances(
    node: str | None = None,
    scope: str | None = None,  # "mine" | "all" (admin-only)
    user: User = Depends(get_current_user),
):
    """List VMs. Users see own VMs only. Admins default to all, can filter with scope=mine."""
    try:
        vms = proxmox.list_vms(node=node)
        non_templates = [v for v in vms if not v.get("template", 0)]

        if user.role == "admin" and scope != "mine":
            return [_vm_to_read(vm) for vm in non_templates]
        else:
            return [_vm_to_read(vm) for vm in non_templates if _is_owner(vm, user.id)]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.get("/{node}/{vmid}", response_model=InstanceRead)
async def get_instance(node: str, vmid: int, user: User = Depends(get_current_user)):
    """Get a single VM — must be owner or admin."""
    try:
        vm = proxmox.get_vm(node, vmid)
        if user.role != "admin" and not _is_owner(vm, user.id):
            raise HTTPException(status_code=403, detail="Not your instance")
        return _vm_to_read(vm)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.post("", status_code=201)
@limiter.limit("5/minute")
async def create_instance(
    request: Request,
    req: CreateInstanceRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new VM with quota enforcement and ownership tagging."""
    # Resolve machine type
    result = await db.execute(
        select(MachineType).where(MachineType.name == req.machine_type)
    )
    mt = result.scalar_one_or_none()
    if mt is None:
        raise HTTPException(status_code=400, detail=f"Unknown machine type: {req.machine_type}")

    # Quota enforcement
    if user.quota and user.role != "admin":
        try:
            all_vms = proxmox.list_vms()
            my_vms = [v for v in all_vms if _is_owner(v, user.id) and not v.get("template", 0)]

            used_vcpus = sum(v.get("cpus", 0) or v.get("maxcpu", 0) for v in my_vms)
            used_ram_mb = sum(v.get("maxmem", 0) for v in my_vms)
            used_disk_bytes = sum(v.get("maxdisk", 0) for v in my_vms)

            if used_vcpus + mt.vcpus > user.quota.max_vcpus:
                raise HTTPException(
                    status_code=403,
                    detail=f"vCPU quota exceeded: {used_vcpus} + {mt.vcpus} > {user.quota.max_vcpus}",
                )
            if (used_ram_mb / (1024**2)) + (mt.memory_mb) > user.quota.max_ram_gb * 1024:
                raise HTTPException(
                    status_code=403,
                    detail=f"RAM quota exceeded",
                )
            if (used_disk_bytes / (1024**3)) + req.boot_disk.size_gb > user.quota.max_disk_gb:
                raise HTTPException(
                    status_code=403,
                    detail=f"Disk quota exceeded",
                )
        except HTTPException:
            raise
        except Exception:
            pass  # If we can't check quotas, allow the creation

    # Build tags: combine user-provided tags with owner tag
    owner_tag = f"{OWNER_TAG_PREFIX}{user.id}"
    all_tags = [owner_tag]
    if req.tags:
        all_tags.extend([t.strip() for t in req.tags.split(",") if t.strip()])
    tags_str = ";".join(all_tags)  # Proxmox uses semicolon separator

    try:
        return proxmox.create_vm(
            node=req.node,
            template_vmid=req.template_vmid,
            name=req.name,
            vcpus=mt.vcpus,
            memory_mb=mt.memory_mb,
            storage=req.boot_disk.storage,
            disk_size_gb=req.boot_disk.size_gb,
            start=req.start_after_create,
            description=req.description or "",
            tags=tags_str,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.post("/{node}/{vmid}/action")
@limiter.limit("20/minute")
async def instance_action(
    request: Request,
    node: str,
    vmid: int,
    body: InstanceAction,
    user: User = Depends(get_current_user),
):
    """Perform an action on a VM — must be owner or admin."""
    try:
        vm_data = proxmox.get_vm(node, vmid)
        if user.role != "admin" and not _is_owner(vm_data, user.id):
            raise HTTPException(status_code=403, detail="Not your instance")
        return proxmox.vm_action(node, vmid, body.action)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")


@router.delete("/{node}/{vmid}")
async def delete_instance(node: str, vmid: int, user: User = Depends(get_current_user)):
    """Delete a VM — must be owner or admin."""
    try:
        vm_data = proxmox.get_vm(node, vmid)
        if user.role != "admin" and not _is_owner(vm_data, user.id):
            raise HTTPException(status_code=403, detail="Not your instance")
        return proxmox.delete_vm(node, vmid)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")
