"""UCP VM — FastAPI entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routers import (
    auth,
    instances,
    lxc,
    nodes,
    machine_types,
    images,
    storage,
    dashboard,
    snapshots,
    backups,
    admin,
    metrics,
    search,
    logs,
    networks,
    audit,
    shell,
)

# ── Rate limiter ─────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="UCP VM — Unified Cloud Platform",
    description="GCP-style VM & LXC management for Proxmox VE",
    version="0.5.0",
    lifespan=lifespan,
)

# Attach limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS (restrict to frontend origins) ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routers ────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(instances.router, prefix="/api")
app.include_router(lxc.router, prefix="/api")
app.include_router(nodes.router, prefix="/api")
app.include_router(machine_types.router, prefix="/api")
app.include_router(images.router, prefix="/api")
app.include_router(storage.router, prefix="/api")
app.include_router(snapshots.router, prefix="/api")
app.include_router(backups.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
app.include_router(networks.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(shell.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "ucp-vm", "version": "0.5.0"}
