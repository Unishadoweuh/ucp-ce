import { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Skeleton,
    Typography,
    ToggleButton,
    ToggleButtonGroup,
    Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { fetchInstances, fetchLxcList } from '../api/client';
import api from '../api/client';

interface InstanceOption {
    vmid: number;
    name: string;
    node: string;
    type: string;
}

interface MetricSeries {
    time: number;
    value: number;
}

interface MetricsData {
    cpu: MetricSeries[];
    memory: MetricSeries[];
    disk_read: MetricSeries[];
    disk_write: MetricSeries[];
    net_in: MetricSeries[];
    net_out: MetricSeries[];
}

const TIMEFRAMES = [
    { value: 'hour', label: '1H' },
    { value: 'day', label: '24H' },
    { value: 'week', label: '7D' },
    { value: 'month', label: '30D' },
];

function MetricChart({
    title,
    data,
    color,
    unit,
    isDark,
}: {
    title: string;
    data: MetricSeries[];
    color: string;
    unit: string;
    isDark: boolean;
}) {
    const borderColor = isDark ? '#3c4043' : '#dadce0';
    const gridColor = isDark ? '#3c4043' : '#e8eaed';

    const formatTime = (ts: number) => {
        const d = new Date(ts * 1000);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <Card>
            <CardContent sx={{ pb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {title}
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                            dataKey="time"
                            tickFormatter={formatTime}
                            tick={{ fontSize: 10, fill: isDark ? '#9aa0a6' : '#5f6368' }}
                            axisLine={{ stroke: gridColor }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: isDark ? '#9aa0a6' : '#5f6368' }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDark ? '#292a2d' : '#fff',
                                border: `1px solid ${borderColor}`,
                                borderRadius: 8,
                                fontSize: '0.75rem',
                            }}
                            formatter={(value: any) => [`${Number(value).toFixed(2)} ${unit}`, title]}
                            labelFormatter={(ts: any) => new Date(Number(ts) * 1000).toLocaleTimeString()}
                        />
                        <defs>
                            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#grad-${title})`}
                            dot={false}
                            animationDuration={500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default function Monitoring() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [instances, setInstances] = useState<InstanceOption[]>([]);
    const [selected, setSelected] = useState('');
    const [timeframe, setTimeframe] = useState('hour');
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const accentBlue = isDark ? '#8ab4f8' : '#1a73e8';
    const accentGreen = isDark ? '#81c995' : '#34a853';

    // Load instances + LXC
    useEffect(() => {
        Promise.all([
            fetchInstances().catch(() => ({ data: [] })),
            fetchLxcList().catch(() => ({ data: [] })),
        ]).then(([vms, cts]) => {
            const vmList = (vms.data || []).map((v: any) => ({ vmid: v.vmid, name: v.name, node: v.node, type: 'vm' }));
            const ctList = (cts.data || []).map((c: any) => ({ vmid: c.vmid, name: c.name, node: c.node, type: 'lxc' }));
            const all = [...vmList, ...ctList];
            setInstances(all);
            if (all.length > 0 && !selected) {
                setSelected(`${all[0].type}|${all[0].node}|${all[0].vmid}`);
            }
        });
    }, []);

    // Load metrics when selection or timeframe changes
    useEffect(() => {
        if (!selected) return;
        const [type, node, vmid] = selected.split('|');
        setLoading(true);
        setError('');
        api.get(`/metrics/${type}/${node}/${vmid}`, { params: { timeframe } })
            .then((res) => setMetrics(res.data))
            .catch((err) => {
                setError(err.response?.data?.detail || 'Failed to load metrics');
                setMetrics(null);
            })
            .finally(() => setLoading(false));
    }, [selected, timeframe]);

    const selectedInstance = instances.find((i) => selected === `${i.type}|${i.node}|${i.vmid}`);

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>Monitoring</Typography>

            {/* Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 280 }}>
                    <InputLabel>Instance</InputLabel>
                    <Select
                        value={selected}
                        label="Instance"
                        onChange={(e) => setSelected(e.target.value)}
                    >
                        {instances.map((inst) => (
                            <MenuItem key={`${inst.type}|${inst.node}|${inst.vmid}`} value={`${inst.type}|${inst.node}|${inst.vmid}`}>
                                [{inst.type.toUpperCase()}] {inst.name} ({inst.vmid})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <ToggleButtonGroup
                    value={timeframe}
                    exclusive
                    onChange={(_, v) => v && setTimeframe(v)}
                    size="small"
                >
                    {TIMEFRAMES.map((tf) => (
                        <ToggleButton key={tf.value} value={tf.value} sx={{ px: 2, fontWeight: 500, fontSize: '0.75rem' }}>
                            {tf.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Metrics Grid */}
            {loading ? (
                <Grid container spacing={2}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Grid item xs={12} md={6} key={i}>
                            <Skeleton variant="rounded" height={260} />
                        </Grid>
                    ))}
                </Grid>
            ) : metrics ? (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <MetricChart title="CPU Usage" data={metrics.cpu} color={accentBlue} unit="%" isDark={isDark} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MetricChart title="Memory Usage" data={metrics.memory} color={accentGreen} unit="GB" isDark={isDark} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MetricChart title="Disk Read" data={metrics.disk_read} color="#fbbc04" unit="MB/s" isDark={isDark} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MetricChart title="Disk Write" data={metrics.disk_write} color="#ea4335" unit="MB/s" isDark={isDark} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MetricChart title="Network In" data={metrics.net_in} color="#a142f4" unit="MB/s" isDark={isDark} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MetricChart title="Network Out" data={metrics.net_out} color="#e37400" unit="MB/s" isDark={isDark} />
                    </Grid>
                </Grid>
            ) : !error && (
                <Alert severity="info">
                    Select an instance to view monitoring data.
                </Alert>
            )}
        </Box>
    );
}
