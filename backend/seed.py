"""Seed default machine types into the database."""

import asyncio
from sqlalchemy import select
from app.database import async_session, engine, Base
from app.models.machine_type import MachineType

DEFAULTS = [
    MachineType(name="ucp-standard-1", series="standard", vcpus=1, memory_mb=2048,
                description="1 vCPU, 2 GB RAM — Small workloads"),
    MachineType(name="ucp-standard-2", series="standard", vcpus=2, memory_mb=4096,
                description="2 vCPUs, 4 GB RAM — General purpose"),
    MachineType(name="ucp-standard-4", series="standard", vcpus=4, memory_mb=8192,
                description="4 vCPUs, 8 GB RAM — Medium workloads"),
    MachineType(name="ucp-standard-8", series="standard", vcpus=8, memory_mb=16384,
                description="8 vCPUs, 16 GB RAM — Large workloads"),
    MachineType(name="ucp-highmem-2", series="highmem", vcpus=2, memory_mb=8192,
                description="2 vCPUs, 8 GB RAM — Memory-intensive"),
    MachineType(name="ucp-highmem-4", series="highmem", vcpus=4, memory_mb=16384,
                description="4 vCPUs, 16 GB RAM — Memory-intensive"),
    MachineType(name="ucp-highcpu-2", series="highcpu", vcpus=2, memory_mb=2048,
                description="2 vCPUs, 2 GB RAM — CPU-intensive"),
    MachineType(name="ucp-highcpu-4", series="highcpu", vcpus=4, memory_mb=4096,
                description="4 vCPUs, 4 GB RAM — CPU-intensive"),
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        for mt in DEFAULTS:
            existing = await session.execute(
                select(MachineType).where(MachineType.name == mt.name)
            )
            if existing.scalar_one_or_none() is None:
                session.add(mt)
        await session.commit()
        print(f"✅ Seeded {len(DEFAULTS)} machine types")


if __name__ == "__main__":
    asyncio.run(seed())
