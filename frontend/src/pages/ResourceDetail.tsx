import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    Tab,
    Tabs,
    Typography,
    Snackbar,
    Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import TerminalIcon from '@mui/icons-material/Terminal';
import StatusChip from '../components/StatusChip';
import api from '../api/client';
import { instanceAction, lxcAction } from '../api/client';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
    return <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>{value === index && children}</Box>;
}

export default function ResourceDetail() {
    const { type, node, vmid } = useParams<{ type: string; node: string; vmid: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [resource, setResource] = useState<any>(null);
    const [metrics, setMetrics] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [snack, setSnack] = useState({ open: false, message: '' });

    const isQemu = type === 'qemu' || type === 'vm';
    const backPath = isQemu ? '/compute/instances' : '/compute/lxc';

    const load = () => {
        setLoading(true);
        const endpoint = isQemu ? `/instances` : `/lxc`;
        api.get(endpoint)
            .then(res => {
                const list = res.data || [];
                const found = list.find((r: any) => r.vmid === parseInt(vmid || '0') && r.node === node);
                setResource(found || null);
            })
            .catch(err => setError(err.response?.data?.detail || 'Failed to load'))
            .finally(() => setLoading(false));
    };

    const loadMetrics = () => {
        api.get(`/metrics/${node}/${vmid}`, { params: { timeframe: 'hour', type: isQemu ? 'qemu' : 'lxc' } })
            .then(res => setMetrics(res.data || []))
            .catch(() => { });
    };

    const loadLogs = () => {
        const endpoint = isQemu ? `/logs/vm/${node}/${vmid}` : `/logs/lxc/${node}/${vmid}`;
        api.get(endpoint)
            .then(res => setLogs(res.data || []))
            .catch(() => { });
    };

    useEffect(() => { load(); }, [node, vmid, type]);
    useEffect(() => { if (tab === 1) loadMetrics(); }, [tab]);
    useEffect(() => { if (tab === 2) loadLogs(); }, [tab]);

    const handleAction = async (action: string) => {
        try {
            const id = parseInt(vmid || '0');
            if (isQemu) await instanceAction(node!, id, action);
            else await lxcAction(node!, id, action);
            setSnack({ open: true, message: `${action} sent` });
            setTimeout(load, 2000);
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || `Failed to ${action}` });
        }
    };

    const borderColor = isDark ? '#3c4043' : '#dadce0';
    const isRunning = resource?.status === 'running';

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
    if (!resource) return <Alert severity="error" sx={{ mt: 4 }}>Resource not found</Alert>;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconButton onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h4">{resource.name}</Typography>
                        <StatusChip status={resource.status} />
                        <Chip label={isQemu ? 'VM' : 'LXC'} size="small" sx={{
                            fontSize: '0.65rem', fontWeight: 700, height: 20,
                            bgcolor: isQemu ? 'rgba(26,115,232,0.12)' : 'rgba(156,39,176,0.12)',
                            color: isQemu ? '#1a73e8' : '#9c27b0',
                        }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        VMID {resource.vmid} · {resource.node}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {!isRunning && (
                        <Tooltip title="Start"><IconButton onClick={() => handleAction('start')} sx={{ color: '#34a853' }}>
                            <PlayArrowIcon /></IconButton></Tooltip>
                    )}
                    {isRunning && (
                        <>
                            <Tooltip title="Stop"><IconButton onClick={() => handleAction('shutdown')} sx={{ color: '#ea4335' }}>
                                <StopIcon /></IconButton></Tooltip>
                            <Tooltip title="Reboot"><IconButton onClick={() => handleAction(isQemu ? 'reset' : 'reboot')} sx={{ color: '#fbbc04' }}>
                                <RestartAltIcon /></IconButton></Tooltip>
                        </>
                    )}
                    {isRunning && (
                        <Tooltip title="Cloud Shell"><IconButton onClick={() => navigate('/compute/shell')} sx={{ color: isDark ? '#8ab4f8' : '#1a73e8' }}>
                            <TerminalIcon /></IconButton></Tooltip>
                    )}
                </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label="Details" />
                    <Tab label="Monitoring" />
                    <Tab label="Logs" />
                </Tabs>
            </Box>

            {/* Details Tab */}
            <TabPanel value={tab} index={0}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
                                    Machine Configuration
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">vCPUs</Typography>
                                        <Typography variant="h6">{resource.vcpus || resource.maxcpu || '-'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Memory</Typography>
                                        <Typography variant="h6">{resource.memory_mb ? `${(resource.memory_mb / 1024).toFixed(1)} GB` : '-'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Disk</Typography>
                                        <Typography variant="h6">{resource.disk_gb ? `${resource.disk_gb} GB` : '-'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Uptime</Typography>
                                        <Typography variant="h6">{resource.uptime ? formatUptime(resource.uptime) : '—'}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
                                    Network & Identity
                                </Typography>
                                <Box sx={{ display: 'grid', gap: 1.5 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Node (Zone)</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{resource.node}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">VMID</Typography>
                                        <Typography variant="body1" sx={{ fontFamily: 'Roboto Mono, monospace' }}>{resource.vmid}</Typography>
                                    </Box>
                                    {resource.tags && (
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Tags</Typography>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {(resource.tags || '').split(';').filter(Boolean).map((tag: string) => (
                                                    <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                                ))}
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Monitoring Tab */}
            <TabPanel value={tab} index={1}>
                <Grid container spacing={2}>
                    {['cpu', 'mem'].map(metric => {
                        const chartData = metrics.map(m => ({
                            time: m.time,
                            value: metric === 'cpu' ? (m.cpu || 0) * 100 : ((m.mem || 0) / (m.maxmem || 1)) * 100,
                        }));
                        return (
                            <Grid item xs={12} md={6} key={metric}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="subtitle2" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.08em' }}>
                                            {metric === 'cpu' ? 'CPU Usage (%)' : 'Memory Usage (%)'}
                                        </Typography>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={metric === 'cpu' ? '#1a73e8' : '#34a853'} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={metric === 'cpu' ? '#1a73e8' : '#34a853'} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#3c4043' : '#e8eaed'} />
                                                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke={isDark ? '#5f6368' : '#9aa0a6'} />
                                                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke={isDark ? '#5f6368' : '#9aa0a6'} />
                                                <ReTooltip contentStyle={{ backgroundColor: isDark ? '#292a2d' : '#fff', border: `1px solid ${borderColor}` }} />
                                                <Area type="monotone" dataKey="value" stroke={metric === 'cpu' ? '#1a73e8' : '#34a853'} fill={`url(#grad-${metric})`} strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
                {metrics.length === 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>No metrics data available. The instance may need to be running for metrics to appear.</Alert>
                )}
            </TabPanel>

            {/* Logs Tab */}
            <TabPanel value={tab} index={2}>
                {logs.length === 0 ? (
                    <Alert severity="info">No task logs found for this resource.</Alert>
                ) : (
                    <Box sx={{ display: 'grid', gap: 1 }}>
                        {logs.map((log: any, i: number) => (
                            <Card key={i}>
                                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{log.type || 'task'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{log.starttime || log.id}</Typography>
                                        </Box>
                                        <Chip
                                            label={log.status || 'OK'}
                                            size="small"
                                            sx={{
                                                fontSize: '0.6rem', height: 18,
                                                bgcolor: log.status === 'OK' ? 'rgba(52,168,83,0.12)' : 'rgba(234,67,53,0.12)',
                                                color: log.status === 'OK' ? '#34a853' : '#ea4335',
                                            }}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                )}
            </TabPanel>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} message={snack.message} />
        </Box>
    );
}

function formatUptime(seconds: number): string {
    if (seconds === 0) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}
