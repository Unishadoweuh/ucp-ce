"""Cloud Shell — WebSocket proxy to Proxmox VNC/terminal."""

import asyncio
import json
import ssl
import logging
from urllib.parse import urlencode

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
import websockets

from app.config import get_settings
from app.services import proxmox
from app.services.auth import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/shell", tags=["Cloud Shell"])


@router.get("/ticket/{node}/{vmid}")
async def get_vnc_ticket(
    node: str,
    vmid: int,
    resource_type: str = Query(default="qemu"),
    user: User = Depends(get_current_user),
):
    """Get a VNC/terminal ticket from Proxmox for WebSocket connection."""
    pve = proxmox._get_proxmox()

    # Verify ownership
    try:
        if resource_type == "lxc":
            ct = proxmox.get_lxc(node, vmid)
            tags = ct.get("tags", "") or ""
            if user.role != "admin" and f"ucp-owner:{user.id}" not in tags:
                raise HTTPException(status_code=403, detail="Not your container")
            ticket_data = pve.nodes(node).lxc(vmid).vncproxy.post(websocket=1)
        else:
            vm = proxmox.get_vm(node, vmid)
            tags = vm.get("tags", "") or ""
            if user.role != "admin" and f"ucp-owner:{user.id}" not in tags:
                raise HTTPException(status_code=403, detail="Not your VM")
            ticket_data = pve.nodes(node).qemu(vmid).vncproxy.post(websocket=1)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Proxmox error: {exc}")

    return {
        "ticket": ticket_data.get("ticket", ""),
        "port": ticket_data.get("port", ""),
        "node": node,
        "vmid": vmid,
    }


@router.websocket("/ws/{node}/{vmid}")
async def shell_websocket(
    ws: WebSocket,
    node: str,
    vmid: int,
    ticket: str = Query(default=""),
    port: str = Query(default=""),
    resource_type: str = Query(default="qemu"),
):
    """WebSocket proxy: browser ↔ Proxmox VNC WebSocket."""
    await ws.accept()

    settings = get_settings()
    proxmox_host = settings.proxmox_host

    # Build Proxmox WebSocket URL
    path = f"/api2/json/nodes/{node}/{resource_type}/{vmid}/vncwebsocket"
    params = urlencode({"port": port, "vncticket": ticket})
    proxmox_ws_url = f"wss://{proxmox_host}:8006{path}?{params}"

    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        async with websockets.connect(
            proxmox_ws_url,
            ssl=ssl_context,
            additional_headers={"Cookie": f"PVEAuthCookie={ticket}"},
        ) as pve_ws:

            async def browser_to_proxmox():
                try:
                    async for message in ws.iter_bytes():
                        await pve_ws.send(message)
                except WebSocketDisconnect:
                    pass

            async def proxmox_to_browser():
                try:
                    async for message in pve_ws:
                        if isinstance(message, bytes):
                            await ws.send_bytes(message)
                        else:
                            await ws.send_text(message)
                except Exception:
                    pass

            await asyncio.gather(browser_to_proxmox(), proxmox_to_browser())

    except Exception as exc:
        logger.error(f"Shell WebSocket error: {exc}")
        try:
            await ws.close(code=1011, reason=str(exc))
        except Exception:
            pass
