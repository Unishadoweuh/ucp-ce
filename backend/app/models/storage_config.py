from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class StorageConfig(Base):
    __tablename__ = "storage_configs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    storage_name: Mapped[str] = mapped_column(String(64), nullable=False)  # Proxmox storage ID
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # vm_storage | cold_storage
    node: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
