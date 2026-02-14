import { useEffect, useState } from 'react';
import {
    Box,
    Card,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import api from '../api/client';

interface AuditEntry {
    id: number;
    user_id: number;
    action: string;
    resource_type: string;
    resource_id: string;
    detail: string;
    ip_address: string;
    created_at: string;
}

function ActionChip({ action }: { action: string }) {
    const color = action.includes('create') ? '#34a853'
        : action.includes('delete') ? '#ea4335'
            : action.includes('update') || action.includes('resize') ? '#fbbc04'
                : '#1a73e8';
    const bgColor = action.includes('create') ? 'rgba(52,168,83,0.12)'
        : action.includes('delete') ? 'rgba(234,67,53,0.12)'
            : action.includes('update') || action.includes('resize') ? 'rgba(251,188,4,0.12)'
                : 'rgba(26,115,232,0.12)';
    return <Chip label={action} size="small" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.65rem', fontWeight: 700, bgcolor: bgColor, color }} />;
}

export default function Activity() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const loadLogs = () => {
        setLoading(true);
        api.get('/audit', { params: { limit: 100, resource_type: filter || undefined } })
            .then(r => setLogs(r.data))
            .catch(() => setLogs([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadLogs(); }, [filter]);

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <HistoryIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h4">Activity Log</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FormControl sx={{ minWidth: 160 }} size="small">
                        <InputLabel>Filter</InputLabel>
                        <Select value={filter} label="Filter" onChange={e => setFilter(e.target.value)}>
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="vm">VMs</MenuItem>
                            <MenuItem value="lxc">LXC</MenuItem>
                            <MenuItem value="network">Networks</MenuItem>
                            <MenuItem value="firewall_rule">Firewall</MenuItem>
                            <MenuItem value="user">Users</MenuItem>
                        </Select>
                    </FormControl>
                    <Tooltip title="Refresh">
                        <IconButton onClick={loadLogs} sx={{ color: 'primary.main' }}><RefreshIcon /></IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Card>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Time</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Action</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Resource</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Details</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>IP</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                        No activity recorded yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map(log => (
                                    <TableRow key={log.id} hover>
                                        <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                        </TableCell>
                                        <TableCell><ActionChip action={log.action} /></TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Chip label={log.resource_type} size="small" variant="outlined" sx={{ fontSize: '0.65rem', fontWeight: 600, height: 20 }} />
                                                {log.resource_id && (
                                                    <Typography variant="caption" sx={{ fontFamily: '"Roboto Mono", monospace', color: 'text.secondary' }}>
                                                        #{log.resource_id}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {log.detail}
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                                            {log.ip_address || '—'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
}
