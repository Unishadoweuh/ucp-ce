import { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    LinearProgress,
    Skeleton,
    Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ComputerIcon from '@mui/icons-material/Computer';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import { fetchDashboard } from '../api/client';

interface ClusterStats {
    total_vms: number;
    total_lxc: number;
    total_instances: number;
    running_vms: number;
    running_lxc: number;
    running_total: number;
    stopped_vms: number;
    stopped_lxc: number;
    total_vcpus_used: number;
    total_memory_used_mb: number;
    total_memory_max_mb: number;
    total_disk_used_gb: number;
    total_disk_max_gb: number;
    nodes_online: number;
    nodes_total: number;
}

interface NodeSummary {
    node: string;
    status: string;
    cpu_usage: number;
    memory_used_mb: number;
    memory_max_mb: number;
    vm_count: number;
    lxc_count: number;
}

interface DashboardData {
    cluster: ClusterStats;
    nodes: NodeSummary[];
}

function StatCard({
    icon,
    label,
    value,
    sub,
    color = '#1a73e8',
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
}) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${color}1a`,
                        color: color,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                        {label}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        {value}
                    </Typography>
                    {sub && (
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 0.25 }}>
                            {sub}
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}

function NodeCard({ node }: { node: NodeSummary }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const memPercent = node.memory_max_mb
        ? Math.round((node.memory_used_mb / node.memory_max_mb) * 100)
        : 0;
    const memGB = (node.memory_used_mb / 1024).toFixed(1);
    const maxGB = (node.memory_max_mb / 1024).toFixed(1);
    const barBg = isDark ? '#3c4043' : '#e8eaed';

    return (
        <Card>
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DnsIcon sx={{ color: node.status === 'online' ? '#34a853' : '#ea4335', fontSize: 20 }} />
                        <Typography variant="h6">{node.node}</Typography>
                    </Box>
                    <Typography
                        variant="body2"
                        sx={{
                            color: node.status === 'online' ? (isDark ? '#81c995' : '#34a853') : '#ea4335',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                        }}
                    >
                        {node.status}
                    </Typography>
                </Box>

                {/* CPU */}
                <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">CPU</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {node.cpu_usage.toFixed(1)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={node.cpu_usage}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: barBg,
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                backgroundColor:
                                    node.cpu_usage > 80 ? '#ea4335' : node.cpu_usage > 60 ? '#fbbc04' : (isDark ? '#8ab4f8' : '#1a73e8'),
                            },
                        }}
                    />
                </Box>

                {/* Memory */}
                <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">Memory</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {memGB} / {maxGB} GB
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={memPercent}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: barBg,
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                backgroundColor:
                                    memPercent > 80 ? '#ea4335' : memPercent > 60 ? '#fbbc04' : (isDark ? '#81c995' : '#34a853'),
                            },
                        }}
                    />
                </Box>

                {/* VMs count */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <ComputerIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                        {node.vm_count} VM{node.vm_count !== 1 ? 's' : ''}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    useEffect(() => {
        fetchDashboard()
            .then((res) => setData(res.data))
            .catch((err) => setError(err.response?.data?.detail || 'Failed to load dashboard'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Box>
                <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((i) => (
                        <Grid item xs={12} sm={6} md={3} key={i}>
                            <Skeleton variant="rounded" height={100} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    if (error) {
        return (
            <Box>
                <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>
                <Alert severity="info">
                    Configure your Proxmox connection in <strong>.env</strong> to see live cluster data.
                </Alert>
            </Box>
        );
    }

    const c = data!.cluster;
    const accentBlue = isDark ? '#8ab4f8' : '#1a73e8';
    const accentGreen = isDark ? '#81c995' : '#34a853';

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<ComputerIcon />}
                        label="VMs"
                        value={c.total_vms}
                        sub={`${c.running_vms} running · ${c.stopped_vms} stopped`}
                        color={accentBlue}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<PlayArrowIcon />}
                        label="LXC Containers"
                        value={c.total_lxc}
                        sub={`${c.running_lxc} running · ${c.stopped_lxc} stopped`}
                        color="#a142f4"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<PlayArrowIcon />} label="Running" value={c.running_vms} color={accentGreen} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<MemoryIcon />} label="vCPUs In Use" value={c.total_vcpus_used} color="#fbbc04" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<StorageIcon />}
                        label="Memory Used"
                        value={`${(c.total_memory_used_mb / 1024).toFixed(1)} GB`}
                        sub={`of ${(c.total_memory_max_mb / 1024).toFixed(0)} GB`}
                        color="#ea4335"
                    />
                </Grid>
            </Grid>

            <Typography variant="h5" sx={{ mb: 2 }}>
                Nodes ({c.nodes_online}/{c.nodes_total} online)
            </Typography>
            <Grid container spacing={2}>
                {data!.nodes.map((node) => (
                    <Grid item xs={12} sm={6} md={4} key={node.node}>
                        <NodeCard node={node} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
