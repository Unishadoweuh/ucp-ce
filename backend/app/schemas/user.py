from pydantic import BaseModel
from typing import Optional


class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token from frontend


class UserRead(BaseModel):
    id: int
    google_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str
    status: str = "approved"

    model_config = {"from_attributes": True}


class QuotaRead(BaseModel):
    id: int
    user_id: int
    max_vcpus: int
    max_ram_gb: int
    max_disk_gb: int
    allowed_networks: Optional[str] = ""

    model_config = {"from_attributes": True}


class QuotaUpdate(BaseModel):
    max_vcpus: Optional[int] = None
    max_ram_gb: Optional[int] = None
    max_disk_gb: Optional[int] = None
    allowed_networks: Optional[str] = None


class RoleUpdate(BaseModel):
    role: str  # "admin" | "user"


class StatusUpdate(BaseModel):
    status: str  # "approved" | "rejected"


class UserWithQuota(UserRead):
    quota: Optional[QuotaRead] = None


class AuthResponse(BaseModel):
    token: str
    user: UserWithQuota


class QuotaUsage(BaseModel):
    used_vcpus: int
    used_ram_gb: float
    used_disk_gb: float
    max_vcpus: int
    max_ram_gb: int
    max_disk_gb: int
