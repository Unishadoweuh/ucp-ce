import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

// Add request interceptor to attach token from localStorage
api.interceptors.request.use(
    (config) => {
        try {
            const token = localStorage.getItem('ucp-token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch {
            // Ignore localStorage errors
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Auth ────────────────────────────────────────────────────
export const googleLogin = (credential: string) =>
    api.post('/auth/google', { credential });

export const fetchMe = () =>
    api.get('/auth/me');

export const fetchMyUsage = () =>
    api.get('/auth/me/usage');

// ── Dashboard ───────────────────────────────────────────────
export const fetchDashboard = (scope = 'all') =>
    api.get('/dashboard', { params: { scope } });

// ── Instances ───────────────────────────────────────────────
export const fetchInstances = (scope?: string) =>
    api.get('/instances', { params: scope ? { scope } : {} });

export const createInstance = (data: any) =>
    api.post('/instances', data);

export const instanceAction = (node: string, vmid: number, action: string) =>
    api.post(`/instances/${node}/${vmid}/action`, { action });

export const deleteInstance = (node: string, vmid: number) =>
    api.delete(`/instances/${node}/${vmid}`);

// ── Nodes ───────────────────────────────────────────────────
export const fetchNodes = () =>
    api.get('/nodes');

// ── Machine Types ───────────────────────────────────────────
export const fetchMachineTypes = () =>
    api.get('/machine-types');

// ── Images ──────────────────────────────────────────────────
export const fetchImages = () =>
    api.get('/images');

// ── Storage ─────────────────────────────────────────────────
export const fetchStorage = () =>
    api.get('/storage');

// ── Snapshots ───────────────────────────────────────────────
export const fetchSnapshots = (node: string, vmid: number) =>
    api.get(`/snapshots/${node}/${vmid}`);

export const createSnapshot = (node: string, vmid: number, name: string, description = '') =>
    api.post(`/snapshots/${node}/${vmid}`, { name, description });

export const deleteSnapshot = (node: string, vmid: number, snapname: string) =>
    api.delete(`/snapshots/${node}/${vmid}/${snapname}`);

// ── Backups ─────────────────────────────────────────────────
export const fetchBackups = (node: string, vmid: number) =>
    api.get(`/backups/${node}/${vmid}`);

export const restoreBackup = (node: string, vmid: number, volid: string, storage?: string) =>
    api.post(`/backups/${node}/${vmid}/restore`, { storage }, { params: { volid } });

// ── LXC Containers ──────────────────────────────────────────
export const fetchLxcList = (scope?: string) =>
    api.get('/lxc', { params: scope ? { scope } : {} });

export const fetchLxc = (node: string, vmid: number) =>
    api.get(`/lxc/${node}/${vmid}`);

export const createLxc = (data: any) =>
    api.post('/lxc', data);

export const lxcAction = (node: string, vmid: number, action: string) =>
    api.post(`/lxc/${node}/${vmid}/action`, { action });

export const resizeLxc = (node: string, vmid: number, cores?: number, memory_mb?: number) =>
    api.post(`/lxc/${node}/${vmid}/resize`, { cores, memory_mb });

export const deleteLxc = (node: string, vmid: number) =>
    api.delete(`/lxc/${node}/${vmid}`);

export const fetchLxcTemplates = (node?: string) =>
    api.get('/lxc/templates', { params: node ? { node } : {} });

export default api;
