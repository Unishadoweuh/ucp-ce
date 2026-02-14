import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import LanIcon from '@mui/icons-material/Lan';
import ShieldIcon from '@mui/icons-material/Shield';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../api/client';

interface Network {
    id: number;
    name: string;
    bridge: string;
    vlan_tag: number | null;
    subnet: string | null;
    gateway: string | null;
    dhcp_enabled: boolean;
    description: string;
    owner_id: number;
    created_at: string;
}

interface FirewallRule {
    id: number;
    network_id: number;
    direction: string;
    action: string;
    protocol: string;
    port_range: string | null;
    source_cidr: string;
    target_tags: string | null;
    priority: number;
    description: string;
    enabled: boolean;
}

function FirewallPanel({ networkId, isDark }: { networkId: number; isDark: boolean }) {
    const [rules, setRules] = useState<FirewallRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ direction: 'ingress', action: 'ALLOW', protocol: 'tcp', port_range: '', source_cidr: '0.0.0.0/0', target_tags: '', priority: 1000, description: '' });

    const loadRules = () => {
        setLoading(true);
        api.get(`/networks/${networkId}/rules`)
            .then(r => setRules(r.data))
            .catch(() => setRules([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadRules(); }, [networkId]);

    const handleCreate = () => {
        api.post(`/networks/${networkId}/rules`, form)
            .then(() => { loadRules(); setShowAdd(false); setForm({ direction: 'ingress', action: 'ALLOW', protocol: 'tcp', port_range: '', source_cidr: '0.0.0.0/0', target_tags: '', priority: 1000, description: '' }); })
            .catch(() => { });
    };

    const handleDelete = (ruleId: number) => {
        api.delete(`/networks/${networkId}/rules/${ruleId}`).then(() => loadRules());
    };

    if (loading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={20} /></Box>;

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShieldIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Firewall Rules</Typography>
                </Box>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setShowAdd(true)}>Add Rule</Button>
            </Box>

            {showAdd && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: isDark ? '#1a1b1e' : '#f8f9fa', borderRadius: 2 }}>
                    <Grid container spacing={1.5}>
                        <Grid item xs={6} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Direction</InputLabel>
                                <Select value={form.direction} label="Direction" onChange={e => setForm({ ...form, direction: e.target.value })}>
                                    <MenuItem value="ingress">Ingress</MenuItem>
                                    <MenuItem value="egress">Egress</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Action</InputLabel>
                                <Select value={form.action} label="Action" onChange={e => setForm({ ...form, action: e.target.value })}>
                                    <MenuItem value="ALLOW">ALLOW</MenuItem>
                                    <MenuItem value="DENY">DENY</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Protocol</InputLabel>
                                <Select value={form.protocol} label="Protocol" onChange={e => setForm({ ...form, protocol: e.target.value })}>
                                    <MenuItem value="tcp">TCP</MenuItem>
                                    <MenuItem value="udp">UDP</MenuItem>
                                    <MenuItem value="icmp">ICMP</MenuItem>
                                    <MenuItem value="all">All</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField fullWidth size="small" label="Ports" placeholder="80,443" value={form.port_range} onChange={e => setForm({ ...form, port_range: e.target.value })} />
                        </Grid>
                        <Grid item xs={6} sm={4}>
                            <TextField fullWidth size="small" label="Source CIDR" value={form.source_cidr} onChange={e => setForm({ ...form, source_cidr: e.target.value })} />
                        </Grid>
                        <Grid item xs={6} sm={4}>
                            <TextField fullWidth size="small" label="Target Tags" placeholder="web-server" value={form.target_tags} onChange={e => setForm({ ...form, target_tags: e.target.value })} />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                            <TextField fullWidth size="small" label="Priority" type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 1000 })} />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                            <Box sx={{ display: 'flex', gap: 1, height: '100%', alignItems: 'flex-end' }}>
                                <Button variant="contained" size="small" onClick={handleCreate}>Add</Button>
                                <Button size="small" onClick={() => setShowAdd(false)}>Cancel</Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {rules.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>No firewall rules configured.</Typography>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Priority</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Direction</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Action</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Protocol</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Ports</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Source</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Tags</TableCell>
                            <TableCell sx={{ width: 40 }}></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rules.map(rule => (
                            <TableRow key={rule.id} hover>
                                <TableCell sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.8rem' }}>{rule.priority}</TableCell>
                                <TableCell>
                                    <Chip label={rule.direction} size="small" sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: rule.direction === 'ingress' ? 'rgba(26,115,232,0.12)' : 'rgba(251,188,4,0.12)', color: rule.direction === 'ingress' ? '#1a73e8' : '#f9a825' }} />
                                </TableCell>
                                <TableCell>
                                    <Chip label={rule.action} size="small" sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: rule.action === 'ALLOW' ? 'rgba(52,168,83,0.12)' : 'rgba(234,67,53,0.12)', color: rule.action === 'ALLOW' ? '#34a853' : '#ea4335' }} />
                                </TableCell>
                                <TableCell sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.8rem' }}>{rule.protocol}</TableCell>
                                <TableCell sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.8rem' }}>{rule.port_range || 'all'}</TableCell>
                                <TableCell sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.8rem' }}>{rule.source_cidr}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{rule.target_tags || '—'}</TableCell>
                                <TableCell>
                                    <IconButton size="small" onClick={() => handleDelete(rule.id)} sx={{ color: 'error.main' }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Box>
    );
}

export default function Networks() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [networks, setNetworks] = useState<Network[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [expandedNet, setExpandedNet] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', bridge: 'vmbr0', vlan_tag: '', subnet: '', gateway: '', dhcp_enabled: false, description: '' });
    const [bridges, setBridges] = useState<any[]>([]);

    const loadNetworks = () => {
        setLoading(true);
        api.get('/networks')
            .then(r => setNetworks(r.data))
            .catch(e => setError(e.response?.data?.detail || 'Failed to load'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadNetworks();
        api.get('/networks/bridges').then(r => setBridges(r.data)).catch(() => { });
    }, []);

    const handleCreate = () => {
        const data = {
            ...form,
            vlan_tag: form.vlan_tag ? parseInt(form.vlan_tag) : null,
            subnet: form.subnet || null,
            gateway: form.gateway || null,
        };
        api.post('/networks', data)
            .then(() => { loadNetworks(); setCreateOpen(false); setForm({ name: '', bridge: 'vmbr0', vlan_tag: '', subnet: '', gateway: '', dhcp_enabled: false, description: '' }); })
            .catch(e => setError(e.response?.data?.detail || 'Failed to create'));
    };

    const handleDelete = (id: number) => {
        api.delete(`/networks/${id}`).then(() => loadNetworks());
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <LanIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h4">VPC Networks</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={loadNetworks} sx={{ color: 'primary.main' }}><RefreshIcon /></IconButton>
                    </Tooltip>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Create Network</Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create VPC Network</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Network Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="my-vpc-network" />
                        <FormControl fullWidth>
                            <InputLabel>Bridge</InputLabel>
                            <Select value={form.bridge} label="Bridge" onChange={e => setForm({ ...form, bridge: e.target.value as string })}>
                                {bridges.length > 0 ? (
                                    [...new Set(bridges.map(b => b.iface))].map(iface => (
                                        <MenuItem key={iface} value={iface}>{iface}</MenuItem>
                                    ))
                                ) : (
                                    <MenuItem value="vmbr0">vmbr0 (default)</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                        <TextField label="VLAN Tag" type="number" value={form.vlan_tag} onChange={e => setForm({ ...form, vlan_tag: e.target.value })} placeholder="Optional" />
                        <TextField label="Subnet (CIDR)" value={form.subnet} onChange={e => setForm({ ...form, subnet: e.target.value })} placeholder="10.0.0.0/24" />
                        <TextField label="Gateway" value={form.gateway} onChange={e => setForm({ ...form, gateway: e.target.value })} placeholder="10.0.0.1" />
                        <FormControlLabel control={<Switch checked={form.dhcp_enabled} onChange={e => setForm({ ...form, dhcp_enabled: e.target.checked })} />} label="Enable DHCP" />
                        <TextField label="Description" multiline rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={!form.name}>Create</Button>
                </DialogActions>
            </Dialog>

            {/* Networks List */}
            {loading ? (
                <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
            ) : networks.length === 0 ? (
                <Card sx={{ p: 4, textAlign: 'center' }}>
                    <LanIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'text.secondary' }}>No VPC networks configured</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 2 }}>Create a network to organize your VMs and containers with isolated networking.</Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Create your first network</Button>
                </Card>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {networks.map(net => (
                        <Card key={net.id}>
                            <Box
                                sx={{ p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', '&:hover': { bgcolor: isDark ? 'rgba(232,234,237,0.04)' : '#f8f9fa' } }}
                                onClick={() => setExpandedNet(expandedNet === net.id ? null : net.id)}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <LanIcon sx={{ color: 'primary.main' }} />
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{net.name}</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                            <Chip label={net.bridge} size="small" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.7rem', fontWeight: 600 }} />
                                            {net.vlan_tag && <Chip label={`VLAN ${net.vlan_tag}`} size="small" sx={{ fontSize: '0.7rem', bgcolor: 'rgba(156,39,176,0.12)', color: '#9c27b0' }} />}
                                            {net.subnet && <Chip label={net.subnet} size="small" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.7rem' }} />}
                                            {net.dhcp_enabled && <Chip label="DHCP" size="small" color="success" sx={{ fontSize: '0.65rem', fontWeight: 700 }} />}
                                        </Box>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Tooltip title="Delete network">
                                        <IconButton size="small" onClick={e => { e.stopPropagation(); handleDelete(net.id); }} sx={{ color: 'error.main' }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    {expandedNet === net.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </Box>
                            </Box>
                            <Collapse in={expandedNet === net.id}>
                                <Divider />
                                <FirewallPanel networkId={net.id} isDark={isDark} />
                            </Collapse>
                        </Card>
                    ))}
                </Box>
            )}
        </Box>
    );
}
