# ☁️ UCP-CM — Unified Cloud Platform

> A **GCP-style** cloud management interface for **Proxmox VE** — manage VMs, LXC containers, networks, and more from a beautiful web UI.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Proxmox](https://img.shields.io/badge/Proxmox-VE-E57000?logo=proxmox&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 🖥️ Compute Engine
- **VM Management** — Create, start, stop, restart, delete VMs via Proxmox templates
- **LXC Containers** — Full lifecycle management for Linux containers
- **Cloud Shell** — Browser-based terminal via xterm.js + WebSocket (Proxmox VNC proxy)
- **Snapshots & Backups** — Create, restore, and manage VM/LXC snapshots
- **Machine Types** — GCP-style presets (Standard, HighMem, HighCPU)

### 🌐 Networking
- **VPC Networks** — Create and manage virtual networks with Proxmox bridges
- **Firewall Rules** — GCP-style ingress/egress rules with priority, protocol, ports, CIDR
- **VLAN Support** — Tag networks with VLAN IDs for isolation

### 📊 Monitoring & Observability
- **Real-time Metrics** — CPU, RAM, Disk I/O, Network TX/RX graphs (Recharts)
- **Logs Explorer** — Proxmox task logs with expandable details and color-coded output
- **Activity Log** — Full audit trail of user actions with IP tracking
- **Global Search** — Search VMs, LXC, and resources with instant results

### 🔐 Security
- **Google OAuth 2.0** authentication
- **Role-based Access Control** — Admin / User roles with resource ownership
- **Rate Limiting** — Auth (10/min), VM creation (5/min), actions (20/min)
- **Quota Management** — Per-user vCPU, RAM, and storage limits
- **Ownership Verification** — Users can only access their own resources

### 🎨 UI/UX (GCP-grade)
- **Material-UI** design system with dark/light mode
- **Collapsible Sidebar** with icon-only mode (64px) and collapsible sections
- **Breadcrumbs Navigation** with human-readable labels
- **Responsive Design** — Desktop and mobile support

---

## 🚀 Quick Start

### Prerequisites

- **Docker** & **Docker Compose** v2+
- A **Proxmox VE** cluster with an API token
- A **Google Cloud** project with OAuth 2.0 credentials

### 1. Clone & Configure

```bash
git clone https://github.com/your-username/UCP-CM.git
cd UCP-CM
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Proxmox
PROXMOX_HOST=192.168.1.100
PROXMOX_TOKEN_NAME=root@pam!ucp
PROXMOX_TOKEN_VALUE=your-token-value
PROXMOX_VERIFY_SSL=false

# PostgreSQL
POSTGRES_USER=ucp
POSTGRES_PASSWORD=strong-password-here

# Google OAuth2
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# JWT (generate with: python3 -c "import secrets; print(secrets.token_urlsafe(32))")
JWT_SECRET=your-random-secret
```

### 2. Create a Proxmox API Token

1. Go to **Proxmox → Datacenter → Permissions → API Tokens**
2. Create a token for `root@pam` (or a dedicated user)
3. **Uncheck** "Privilege Separation"
4. Copy the Token ID and Secret into `.env`

### 3. Launch

```bash
docker compose up --build -d
```

### 4. Access

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API Docs** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/api/health |

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌────────────────┐
│    Frontend      │────▶│   Backend    │────▶│  Proxmox VE    │
│ React 18 / MUI 6 │     │  FastAPI     │     │   Cluster      │
│ xterm.js / Charts│     │  + WebSocket │     │                │
│   (Nginx:80)     │     │ (Uvicorn:8000│     │                │
└─────────────────┘     └──────┬───────┘     └────────────────┘
                               │
                        ┌──────▼───────┐
                        │ PostgreSQL 16 │
                        │  (Metadata)   │
                        └──────────────┘
```

## 📂 Project Structure

```
UCP-CM/
├── docker-compose.yml       # Full stack orchestration
├── .env.example             # Environment template
├── LICENSE                  # MIT License
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/versions/    # DB migrations (001-004)
│   ├── seed.py              # Initial data seeder
│   └── app/
│       ├── main.py          # FastAPI entry point (v0.5.0)
│       ├── config.py        # Pydantic settings
│       ├── database.py      # SQLAlchemy async engine
│       ├── dependencies.py  # Shared ownership verification
│       ├── models/          # User, Quota, MachineType, Network, FirewallRule, AuditLog
│       ├── schemas/         # Pydantic request/response schemas
│       ├── services/
│       │   ├── proxmox.py   # Proxmox API wrapper (VM + LXC + Nodes)
│       │   └── auth.py      # JWT + Google OAuth
│       └── routers/
│           ├── auth.py          # Google OAuth login
│           ├── instances.py     # VM CRUD + actions
│           ├── lxc.py           # LXC CRUD + actions
│           ├── shell.py         # Cloud Shell WebSocket proxy
│           ├── networks.py      # VPC networks + firewall rules
│           ├── audit.py         # Activity log
│           ├── metrics.py       # Monitoring data (Proxmox RRD)
│           ├── logs.py          # Task logs
│           ├── search.py        # Global search
│           ├── snapshots.py     # Snapshot management
│           ├── backups.py       # Backup management
│           └── admin.py         # Admin operations
│
└── frontend/
    ├── Dockerfile           # Multi-stage (build + Nginx)
    ├── nginx.conf           # Reverse proxy to backend
    └── src/
        ├── App.tsx          # Routes
        ├── theme.ts         # GCP design tokens
        ├── AuthContext.tsx   # Auth state management
        ├── api/client.ts    # Axios API client
        ├── components/
        │   ├── Layout.tsx       # Header, breadcrumbs, search
        │   ├── Sidebar.tsx      # Collapsible nav with sections
        │   ├── ProtectedRoute.tsx
        │   └── AdminRoute.tsx
        └── pages/
            ├── Dashboard.tsx       # Cluster overview
            ├── InstanceList.tsx    # VM list (DataGrid)
            ├── CreateInstance.tsx  # VM creation form
            ├── LxcList.tsx        # LXC list
            ├── CreateLxc.tsx      # LXC creation form
            ├── CloudShell.tsx     # xterm.js terminal
            ├── Networks.tsx       # VPC + Firewall rules
            ├── Monitoring.tsx     # Recharts metrics
            ├── Logs.tsx           # Task logs explorer
            ├── Activity.tsx       # Audit trail
            ├── Snapshots.tsx      # Snapshot manager
            ├── Backups.tsx        # Backup manager
            └── admin/             # Users, MachineTypes, Storage
```

## 🔌 API Reference

### Authentication
| Method | Endpoint | Rate Limit | Description |
|--------|----------|------------|-------------|
| `POST` | `/api/auth/google` | 10/min | Google OAuth login |

### Compute
| Method | Endpoint | Rate Limit | Description |
|--------|----------|------------|-------------|
| `GET` | `/api/instances` | — | List VMs |
| `POST` | `/api/instances` | 5/min | Create VM |
| `POST` | `/api/instances/{node}/{vmid}/action` | 20/min | VM action (start/stop/reboot) |
| `DELETE` | `/api/instances/{node}/{vmid}` | — | Delete VM |
| `GET` | `/api/lxc` | — | List LXC containers |
| `POST` | `/api/lxc` | 5/min | Create LXC |
| `WS` | `/api/shell/ws/{node}/{vmid}` | — | Cloud Shell WebSocket |

### Networking
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/networks` | List VPC networks |
| `POST` | `/api/networks` | Create network |
| `DELETE` | `/api/networks/{id}` | Delete network |
| `GET` | `/api/networks/bridges` | List Proxmox bridges |
| `GET` | `/api/networks/{id}/rules` | List firewall rules |
| `POST` | `/api/networks/{id}/rules` | Create firewall rule |

### Monitoring & Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/metrics/{node}/{vmid}` | VM/LXC metrics (RRD) |
| `GET` | `/api/logs/vm/{node}/{vmid}` | VM task logs |
| `GET` | `/api/logs/lxc/{node}/{vmid}` | LXC task logs |
| `GET` | `/api/audit` | Activity log |
| `GET` | `/api/search?q={query}` | Global search |

---

## 🛠️ Development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # → http://localhost:5173
```

### Database Migrations

```bash
cd backend
alembic upgrade head   # Apply all migrations
```

---

## 🏷️ Default Machine Types

| Name | Series | vCPUs | RAM |
|------|--------|-------|-----|
| `ucp-standard-1` | Standard | 1 | 2 GB |
| `ucp-standard-2` | Standard | 2 | 4 GB |
| `ucp-standard-4` | Standard | 4 | 8 GB |
| `ucp-standard-8` | Standard | 8 | 16 GB |
| `ucp-highmem-2` | HighMem | 2 | 8 GB |
| `ucp-highmem-4` | HighMem | 4 | 16 GB |
| `ucp-highcpu-2` | HighCPU | 2 | 2 GB |
| `ucp-highcpu-4` | HighCPU | 4 | 4 GB |

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
# ucp-ce
# ucp-ce
