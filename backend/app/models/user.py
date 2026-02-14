from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    google_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    picture: Mapped[str] = mapped_column(String(512), nullable=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="user")  # admin | user
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    quota: Mapped["Quota"] = relationship("Quota", back_populates="user", uselist=False, lazy="joined")


class Quota(Base):
    __tablename__ = "quotas"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    max_vcpus: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    max_ram_gb: Mapped[int] = mapped_column(Integer, nullable=False, default=16)
    max_disk_gb: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    allowed_networks: Mapped[str] = mapped_column(Text, nullable=True, default="")  # comma-separated bridge IDs

    user: Mapped["User"] = relationship("User", back_populates="quota")
