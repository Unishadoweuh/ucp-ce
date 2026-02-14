import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography,
    CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import api from '../api/client';
import { fetchInstances, fetchLxcList } from '../api/client';

interface AlertRule {
    id: number;
    name: string;
    resource_type: string;
    vmid: number;
    node: string;
    metric: string;
    operator: string;
    threshold: number;
    enabled: boolean;
    created_at: string;
    last_triggered: string | null;
}

interface TriggeredAlert {
    rule: AlertRule;
    current_value: number;
    resource_name: string;
}

interface InstanceOption {
    vmid: number;
    name: string;
    node: string;
    type: string;
}

export default function Alerts() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);
    const [instances, setInstances] = useState<InstanceOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        selectedInstance: '',
        metric: 'cpu',
        operator: 'gt',
        threshold: 80,
    });

    const loadData = () => {
        setLoading(true);
        Promise.all([
            api.get('/alerts/rules').catch(() => ({ data: [] })),
            api.get('/alerts/check').catch(() => ({ data: { triggered: [] } })),
            fetchInstances().catch(() => ({ data: [] })),
            fetchLxcList().catch(() => ({ data: [] })),
        ]).then(([rulesRes, checkRes, vmsRes, lxcRes]) => {
            setRules(rulesRes.data || []);
            setTriggered(checkRes.data?.triggered || []);
            const vmList = (vmsRes.data || []).map((v: any) => ({ vmid: v.vmid, name: v.name, node: v.node, type: 'vm' }));
            const ctList = (lxcRes.data || []).map((c: any) => ({ vmid: c.vmid, name: c.name, node: c.node, type: 'lxc' }));
            setInstances([...vmList, ...ctList]);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async () => {
        if (!form.name || !form.selectedInstance) return;
        const [type, node, vmidStr] = form.selectedInstance.split('|');
        try {
            await api.post('/alerts/rules', {
                name: form.name,
                resource_type: type,
                vmid: parseInt(vmidStr),
                node,
                metric: form.metric,
                operator: form.operator,
                threshold: form.threshold,
            });
            setDialogOpen(false);
            setForm({ name: '', selectedInstance: '', metric: 'cpu', operator: 'gt', threshold: 80 });
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create rule');
        }
    };

    const handleDelete = async (id: number) => {
        await api.delete(`/alerts/rules/${id}`);
        loadData();
    };

    const metricLabel: Record<string, string> = { cpu: 'CPU', memory: 'Memory', disk: 'Disk' };
    const operatorLabel: Record<string, string> = { gt: '>', lt: '<' };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <NotificationsActiveIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h4">Monitoring Alerts</Typography>
                    {triggered.length > 0 && (
                        <Chip label={`${triggered.length} TRIGGERED`} size="small" sx={{ bgcolor: 'rgba(234,67,53,0.12)', color: '#ea4335', fontWeight: 700 }} />
                    )}
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                    Create Alert
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Triggered Alerts */}
            {triggered.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontSize: '0.9375rem', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningAmberIcon sx={{ color: '#ea4335', fontSize: 20 }} />
                        Active Alerts
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                        {triggered.map(t => (
                            <Card key={t.rule.id} sx={{ borderLeft: '4px solid #ea4335' }}>
                                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{t.rule.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {t.resource_name} — {metricLabel[t.rule.metric]} is at {t.current_value}%
                                            (threshold: {operatorLabel[t.rule.operator]} {t.rule.threshold}%)
                                        </Typography>
                                    </Box>
                                    <Chip label="FIRING" size="small" sx={{ bgcolor: 'rgba(234,67,53,0.12)', color: '#ea4335', fontWeight: 700, fontSize: '0.65rem' }} />
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Box>
            )}

            {/* Rules List */}
            <Typography variant="h6" sx={{ fontSize: '0.9375rem', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutlineIcon sx={{ color: '#34a853', fontSize: 20 }} />
                Alert Rules ({rules.length})
            </Typography>

            {rules.length === 0 ? (
                <Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">No alert rules configured. Create one to monitor your resources.</Typography>
                </CardContent></Card>
            ) : (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                    {rules.map(rule => (
                        <Card key={rule.id}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{rule.name}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                        <Chip label={rule.resource_type.toUpperCase()} size="small" sx={{
                                            fontSize: '0.6rem', height: 18, fontWeight: 700,
                                            bgcolor: rule.resource_type === 'vm' ? 'rgba(26,115,232,0.12)' : 'rgba(156,39,176,0.12)',
                                            color: rule.resource_type === 'vm' ? '#1a73e8' : '#9c27b0',
                                        }} />
                                        <Chip label={`VMID ${rule.vmid}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                                        <Chip label={`${metricLabel[rule.metric]} ${operatorLabel[rule.operator]} ${rule.threshold}%`} size="small"
                                            sx={{ fontSize: '0.65rem', height: 20, bgcolor: isDark ? 'rgba(251,188,4,0.12)' : 'rgba(251,188,4,0.1)', color: '#f9a825' }} />
                                    </Box>
                                </Box>
                                <Tooltip title="Delete rule">
                                    <IconButton size="small" onClick={() => handleDelete(rule.id)} sx={{ color: 'text.secondary' }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Alert Rule</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                    <TextField label="Alert Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth placeholder="High CPU on web-server" />
                    <FormControl fullWidth>
                        <InputLabel>Resource</InputLabel>
                        <Select value={form.selectedInstance} label="Resource" onChange={e => setForm({ ...form, selectedInstance: e.target.value })}>
                            {instances.map(inst => (
                                <MenuItem key={`${inst.type}|${inst.node}|${inst.vmid}`} value={`${inst.type}|${inst.node}|${inst.vmid}`}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip label={inst.type === 'vm' ? 'VM' : 'LXC'} size="small" sx={{
                                            fontSize: '0.6rem', fontWeight: 700, height: 18,
                                            bgcolor: inst.type === 'vm' ? 'rgba(26,115,232,0.12)' : 'rgba(156,39,176,0.12)',
                                            color: inst.type === 'vm' ? '#1a73e8' : '#9c27b0',
                                        }} />
                                        {inst.name} ({inst.vmid})
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Metric</InputLabel>
                            <Select value={form.metric} label="Metric" onChange={e => setForm({ ...form, metric: e.target.value })}>
                                <MenuItem value="cpu">CPU %</MenuItem>
                                <MenuItem value="memory">Memory %</MenuItem>
                                <MenuItem value="disk">Disk %</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Condition</InputLabel>
                            <Select value={form.operator} label="Condition" onChange={e => setForm({ ...form, operator: e.target.value })}>
                                <MenuItem value="gt">Greater than</MenuItem>
                                <MenuItem value="lt">Less than</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField label="Threshold %" type="number" value={form.threshold} onChange={e => setForm({ ...form, threshold: Number(e.target.value) })}
                            inputProps={{ min: 0, max: 100 }} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={!form.name || !form.selectedInstance}>Create</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
