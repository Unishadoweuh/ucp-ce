import { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Alert,
    IconButton,
    Tooltip,
    Collapse,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TerminalIcon from '@mui/icons-material/Terminal';
import { fetchInstances, fetchLxcList } from '../api/client';
import api from '../api/client';

interface InstanceOption {
    vmid: number;
    name: string;
    node: string;
    type: string;
}

interface TaskEntry {
    upid: string;
    type: string;
    status: string;
    starttime: number;
    endtime: number;
    user: string;
    node: string;
}

interface TaskDetail {
    upid: string;
    lines: string[];
}

function StatusChip({ status }: { status: string }) {
    const s = (status || '').toLowerCase();
    if (s === 'ok' || s.startsWith('ok')) return <Chip label="OK" size="small" sx={{ bgcolor: 'rgba(52,168,83,0.12)', color: '#34a853', fontWeight: 600, fontSize: '0.7rem' }} />;
    if (s.includes('error') || s.includes('fail')) return <Chip label="ERROR" size="small" sx={{ bgcolor: 'rgba(234,67,53,0.12)', color: '#ea4335', fontWeight: 600, fontSize: '0.7rem' }} />;
    if (s.includes('running') || s === '') return <Chip label="RUNNING" size="small" sx={{ bgcolor: 'rgba(26,115,232,0.12)', color: '#1a73e8', fontWeight: 600, fontSize: '0.7rem' }} />;
    return <Chip label={status} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />;
}

function TaskDetailPanel({ node, upid }: { node: string; upid: string }) {
    const [detail, setDetail] = useState<TaskDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    useEffect(() => {
        api.get(`/logs/task/${node}/${encodeURIComponent(upid)}`)
            .then((res) => setDetail(res.data))
            .catch(() => setDetail(null))
            .finally(() => setLoading(false));
    }, [node, upid]);

    if (loading) return <Box sx={{ p: 2 }}><CircularProgress size={16} /></Box>;
    if (!detail) return <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>Unable to load task logs.</Typography>;

    return (
        <Box sx={{
            p: 1.5,
            bgcolor: isDark ? '#1a1b1e' : '#f8f9fa',
            borderRadius: 1,
            maxHeight: 300,
            overflow: 'auto',
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '0.75rem',
            lineHeight: 1.6,
        }}>
            {detail.lines.map((line, i) => (
                <Box key={i} sx={{ color: line.includes('ERROR') ? '#ea4335' : line.includes('WARN') ? '#fbbc04' : 'text.secondary' }}>
                    {line}
                </Box>
            ))}
        </Box>
    );
}

export default function Logs() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [instances, setInstances] = useState<InstanceOption[]>([]);
    const [selected, setSelected] = useState('');
    const [tasks, setTasks] = useState<TaskEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedTask, setExpandedTask] = useState<string | null>(null);

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

    const loadLogs = useCallback(() => {
        if (!selected) return;
        const [type, node, vmid] = selected.split('|');
        setLoading(true);
        setError('');
        api.get(`/logs/${type}/${node}/${vmid}`)
            .then((res) => setTasks(res.data.tasks || []))
            .catch((err) => {
                setError(err.response?.data?.detail || 'Failed to load logs');
                setTasks([]);
            })
            .finally(() => setLoading(false));
    }, [selected]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString() : '—';

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TerminalIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h4">Logs Explorer</Typography>
                </Box>
                <Tooltip title="Refresh logs">
                    <IconButton onClick={loadLogs} sx={{ color: 'primary.main' }}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Instance Selector */}
            <Box sx={{ mb: 3 }}>
                <FormControl sx={{ minWidth: 320 }}>
                    <InputLabel>Instance</InputLabel>
                    <Select value={selected} label="Instance" onChange={(e) => setSelected(e.target.value)}>
                        {instances.map((inst) => (
                            <MenuItem key={`${inst.type}|${inst.node}|${inst.vmid}`} value={`${inst.type}|${inst.node}|${inst.vmid}`}>
                                [{inst.type.toUpperCase()}] {inst.name} ({inst.vmid})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Task Logs Table */}
            <Card>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, width: 40 }}></TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Task Type</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Started</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Ended</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : tasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                        No task logs found for this instance.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tasks.map((task) => (
                                    <>
                                        <TableRow
                                            key={task.upid}
                                            hover
                                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: isDark ? 'rgba(232,234,237,0.08)' : '#f1f3f4' } }}
                                            onClick={() => setExpandedTask(expandedTask === task.upid ? null : task.upid)}
                                        >
                                            <TableCell>
                                                <IconButton size="small">
                                                    {expandedTask === task.upid ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                </IconButton>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: '"Roboto Mono", monospace' }}>
                                                    {task.type}
                                                </Typography>
                                            </TableCell>
                                            <TableCell><StatusChip status={task.status} /></TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{formatTime(task.starttime)}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem' }}>{formatTime(task.endtime)}</TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{task.user}</TableCell>
                                        </TableRow>
                                        {expandedTask === task.upid && (
                                            <TableRow key={`${task.upid}-detail`}>
                                                <TableCell colSpan={6} sx={{ p: 0 }}>
                                                    <Collapse in>
                                                        <Box sx={{ p: 2 }}>
                                                            <TaskDetailPanel node={task.node} upid={task.upid} />
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
}
