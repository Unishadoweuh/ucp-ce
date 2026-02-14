import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    CircularProgress,
    Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import api from '../api/client';

interface ResourceCost {
    name: string;
    vmid: number;
    type: string;
    node: string;
    status: string;
    vcpus: number;
    memory_gb: number;
    disk_gb: number;
    uptime_hours: number;
    estimated_monthly: { cpu: number; ram: number; disk: number; total: number };
}

interface BillingData {
    currency: string;
    resources: ResourceCost[];
    total_estimated_monthly: number;
    generated_at: string;
    rates: { vcpu_hour: number; ram_gb_hour: number; disk_gb_month: number };
}

export default function Billing() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [data, setData] = useState<BillingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/billing/summary')
            .then(res => setData(res.data))
            .catch(err => setError(err.response?.data?.detail || 'Failed to load billing'))
            .finally(() => setLoading(false));
    }, []);

    const borderColor = isDark ? '#3c4043' : '#dadce0';

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <AttachMoneyIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h4">Billing</Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {data && (
                <>
                    {/* Summary Cards */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">Estimated Monthly</Typography>
                                <Typography variant="h4" sx={{ color: '#34a853', fontWeight: 700, mt: 1 }}>
                                    ${data.total_estimated_monthly.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">USD</Typography>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">Active Resources</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                                    {data.resources.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {data.resources.filter(r => r.status === 'running').length} running
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">Total vCPUs</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                                    {data.resources.reduce((sum, r) => sum + r.vcpus, 0)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ${data.rates.vcpu_hour}/vCPU-hr
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">Total Storage</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                                    {data.resources.reduce((sum, r) => sum + r.disk_gb, 0)} GB
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ${data.rates.disk_gb_month}/GB-mo
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Resource Breakdown */}
                    <Typography variant="h6" sx={{ mb: 1.5, fontSize: '0.9375rem' }}>Resource Breakdown</Typography>
                    <TableContainer component={Paper} sx={{ border: `1px solid ${borderColor}`, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: isDark ? '#35363a' : '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Resource</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>vCPUs</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>RAM</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Disk</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>CPU Cost</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>RAM Cost</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Disk Cost</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total/mo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.resources.map(r => (
                                    <TableRow key={`${r.type}-${r.vmid}`} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{r.name}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={r.type}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.65rem', fontWeight: 700, height: 20,
                                                    bgcolor: r.type === 'VM' ? 'rgba(26,115,232,0.12)' : 'rgba(156,39,176,0.12)',
                                                    color: r.type === 'VM' ? '#1a73e8' : '#9c27b0',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={r.status}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.6rem', height: 18,
                                                    bgcolor: r.status === 'running' ? 'rgba(52,168,83,0.12)' : 'rgba(234,67,53,0.12)',
                                                    color: r.status === 'running' ? '#34a853' : '#ea4335',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">{r.vcpus}</TableCell>
                                        <TableCell align="right">{r.memory_gb} GB</TableCell>
                                        <TableCell align="right">{r.disk_gb} GB</TableCell>
                                        <TableCell align="right">${r.estimated_monthly.cpu.toFixed(2)}</TableCell>
                                        <TableCell align="right">${r.estimated_monthly.ram.toFixed(2)}</TableCell>
                                        <TableCell align="right">${r.estimated_monthly.disk.toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>${r.estimated_monthly.total.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ backgroundColor: isDark ? '#35363a' : '#f8f9fa' }}>
                                    <TableCell colSpan={9} align="right" sx={{ fontWeight: 700 }}>Total Estimated Monthly</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1rem', color: '#34a853' }}>
                                        ${data.total_estimated_monthly.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
        </Box>
    );
}
