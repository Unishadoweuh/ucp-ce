from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class MachineType(Base):
    __tablename__ = "machine_types"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    series: Mapped[str] = mapped_column(String(32), nullable=False, default="standard")
    vcpus: Mapped[int] = mapped_column(Integer, nullable=False)
    memory_mb: Mapped[int] = mapped_column(Integer, nullable=False)
    target: Mapped[str] = mapped_column(String(16), nullable=False, default="both")  # vm | lxc | both
    description: Mapped[str] = mapped_column(Text, nullable=True)
