import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    TextField,
    Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';
import { fetchNodes, fetchLxcTemplates } from '../api/client';

interface NodeOption { node: string; status: string }
interface TemplateOption { volid: string; node: string; storage: string }

interface CreateLxcProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    embedded?: boolean;
}

export default function CreateLxc({ onSuccess, onCancel, embedded }: CreateLxcProps = {}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();
    const [nodes, setNodes] = useState<NodeOption[]>([]);
    const [templates, setTemplates] = useState<TemplateOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [snack, setSnack] = useState({ open: false, message: '' });

    const [form, setForm] = useState({
        name: '',
        node: '',
        ostemplate: '',
        memory_mb: 512,
        swap_mb: 512,
        cores: 1,
        disk_gb: 8,
        storage: 'local-lvm',
        net_bridge: 'vmbr0',
        net_ip: 'dhcp',
        net_gateway: '',
        unprivileged: true,
        start_after_create: true,
        description: '',
        password: '',
    });

    useEffect(() => {
        fetchNodes().then((res) => {
            const nodeList = res.data || [];
            setNodes(nodeList);
            if (nodeList.length === 1) {
                setForm((f) => ({ ...f, node: nodeList[0].node }));
            }
        }).catch(() => { });
        fetchLxcTemplates().then((res) => setTemplates(res.data)).catch(() => { });
    }, []);

    const filteredTemplates = form.node
        ? templates.filter((t) => t.node === form.node)
        : templates;

    const handleSubmit = async () => {
        if (!form.name || !form.node || !form.ostemplate) {
            setError('Name, Node, and Template are required.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await axios.post('/api/lxc', form);
            setSnack({ open: true, message: `Container "${form.name}" is being created...` });
            if (onSuccess) {
                setTimeout(onSuccess, 800);
            } else {
                setTimeout(() => navigate('/compute/lxc'), 1500);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create container');
        } finally {
            setLoading(false);
        }
    };

    const sectionBar = {
        borderLeft: `3px solid ${isDark ? '#bb86fc' : '#a142f4'}`,
        pl: 2,
        py: 0.5,
        mb: 2,
    };

    return (
        <Box sx={{ maxWidth: 800 }}>
            <Typography variant={embedded ? 'h5' : 'h4'} sx={{ mb: 3 }}>Create LXC Container</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Identity */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={sectionBar}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Identity</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Container Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="my-container"
                            fullWidth
                            required
                        />
                        <FormControl fullWidth required>
                            <InputLabel>Node (Region)</InputLabel>
                            <Select
                                value={form.node}
                                label="Node (Region)"
                                onChange={(e) => setForm({ ...form, node: e.target.value, ostemplate: '' })}
                            >
                                {nodes.map((n) => (
                                    <MenuItem key={n.node} value={n.node}>{n.node}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </CardContent>
            </Card>

            {/* Template */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={sectionBar}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>OS Template</Typography>
                    </Box>
                    <FormControl fullWidth required>
                        <InputLabel>Container Template</InputLabel>
                        <Select
                            value={form.ostemplate}
                            label="Container Template"
                            onChange={(e) => setForm({ ...form, ostemplate: e.target.value })}
                        >
                            {filteredTemplates.map((t) => {
                                const label = t.volid.split('/').pop() || t.volid;
                                return (
                                    <MenuItem key={t.volid} value={t.volid}>
                                        {label} — {t.storage}
                                    </MenuItem>
                                );
                            })}
                            {filteredTemplates.length === 0 && (
                                <MenuItem disabled>
                                    {form.node ? 'No templates found on this node' : 'Select a node first'}
                                </MenuItem>
                            )}
                        </Select>
                    </FormControl>
                </CardContent>
            </Card>

            {/* Resources */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={sectionBar}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Resources</Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="CPU Cores"
                            type="number"
                            value={form.cores}
                            onChange={(e) => setForm({ ...form, cores: parseInt(e.target.value) || 1 })}
                            inputProps={{ min: 1, step: 1 }}
                            fullWidth
                        />
                        <TextField
                            label="Memory (MB)"
                            type="number"
                            value={form.memory_mb}
                            onChange={(e) => setForm({ ...form, memory_mb: parseInt(e.target.value) || 256 })}
                            inputProps={{ min: 128, step: 128 }}
                            fullWidth
                        />
                        <TextField
                            label="Swap (MB)"
                            type="number"
                            value={form.swap_mb}
                            onChange={(e) => setForm({ ...form, swap_mb: parseInt(e.target.value) || 0 })}
                            inputProps={{ min: 0, step: 128 }}
                            fullWidth
                        />
                        <TextField
                            label="Root Disk (GB)"
                            type="number"
                            value={form.disk_gb}
                            onChange={(e) => setForm({ ...form, disk_gb: parseInt(e.target.value) || 4 })}
                            inputProps={{ min: 1 }}
                            fullWidth
                        />
                        <TextField
                            label="Storage"
                            value={form.storage}
                            onChange={(e) => setForm({ ...form, storage: e.target.value })}
                            fullWidth
                            placeholder="local-lvm"
                        />
                    </Box>
                </CardContent>
            </Card>

            {/* Networking */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={sectionBar}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Networking</Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="Bridge"
                            value={form.net_bridge}
                            onChange={(e) => setForm({ ...form, net_bridge: e.target.value })}
                            fullWidth
                            placeholder="vmbr0"
                        />
                        <TextField
                            label="IP Address (or 'dhcp')"
                            value={form.net_ip}
                            onChange={(e) => setForm({ ...form, net_ip: e.target.value })}
                            fullWidth
                            placeholder="dhcp or 10.0.0.5/24"
                        />
                        {form.net_ip !== 'dhcp' && (
                            <TextField
                                label="Gateway"
                                value={form.net_gateway}
                                onChange={(e) => setForm({ ...form, net_gateway: e.target.value })}
                                fullWidth
                                placeholder="10.0.0.1"
                            />
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Security & Options */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={sectionBar}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Options</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={form.unprivileged}
                                    onChange={(e) => setForm({ ...form, unprivileged: e.target.checked })}
                                />
                            }
                            label="Unprivileged container (recommended)"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={form.start_after_create}
                                    onChange={(e) => setForm({ ...form, start_after_create: e.target.checked })}
                                />
                            }
                            label="Start after creation"
                        />
                        <TextField
                            label="Root Password (optional)"
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            fullWidth
                            placeholder="Leave empty for SSH key only"
                        />
                        <TextField
                            label="Description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                        />
                    </Box>
                </CardContent>
            </Card>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={() => onCancel ? onCancel() : navigate('/compute/lxc')}>Cancel</Button>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? 'Creating…' : 'Create'}
                </Button>
            </Box>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack({ ...snack, open: false })}
                message={snack.message}
            />
        </Box>
    );
}
