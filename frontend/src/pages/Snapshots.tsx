import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import {
    fetchInstances,
    fetchSnapshots,
    createSnapshot,
    deleteSnapshot,
} from '../api/client';

interface Instance {
    vmid: number;
    name: string;
    node: string;
    status: string;
}

interface Snapshot {
    name: string;
    description: string;
    snaptime: number;
    parent: string;
    vmstate: number;
}

export default function Snapshots() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [instances, setInstances] = useState<Instance[]>([]);
    const [selectedVm, setSelectedVm] = useState<string>('');
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [snack, setSnack] = useState({ open: false, message: '' });
    const [createDialog, setCreateDialog] = useState(false);
    const [newSnapName, setNewSnapName] = useState('');
    const [newSnapDesc, setNewSnapDesc] = useState('');

    // Load instances
    useEffect(() => {
        fetchInstances()
            .then((res) => setInstances(res.data))
            .catch(() => setError('Failed to load instances'));
    }, []);

    // Load snapshots when VM changes
    useEffect(() => {
        if (!selectedVm) {
            setSnapshots([]);
            return;
        }
        const [node, vmidStr] = selectedVm.split('/');
        setLoading(true);
        fetchSnapshots(node, Number(vmidStr))
            .then((res) => setSnapshots(res.data))
            .catch((err) => setError(err.response?.data?.detail || 'Failed to load snapshots'))
            .finally(() => setLoading(false));
    }, [selectedVm]);

    const handleCreate = async () => {
        if (!selectedVm || !newSnapName) return;
        const [node, vmidStr] = selectedVm.split('/');
        try {
            await createSnapshot(node, Number(vmidStr), newSnapName, newSnapDesc);
            setSnack({ open: true, message: `Snapshot "${newSnapName}" created` });
            setCreateDialog(false);
            setNewSnapName('');
            setNewSnapDesc('');
            // Refresh
            const res = await fetchSnapshots(node, Number(vmidStr));
            setSnapshots(res.data);
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to create snapshot' });
        }
    };

    const handleDelete = async (snapname: string) => {
        if (!selectedVm) return;
        const [node, vmidStr] = selectedVm.split('/');
        try {
            await deleteSnapshot(node, Number(vmidStr), snapname);
            setSnack({ open: true, message: `Snapshot "${snapname}" deleted` });
            setSnapshots((prev) => prev.filter((s) => s.name !== snapname));
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to delete snapshot' });
        }
    };

    const selectedInstance = instances.find((i) => `${i.node}/${i.vmid}` === selectedVm);

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Snapshots</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    disabled={!selectedVm}
                    onClick={() => setCreateDialog(true)}
                >
                    Create Snapshot
                </Button>
            </Box>

            {error && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* VM Selector */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                    <FormControl sx={{ minWidth: 300 }}>
                        <InputLabel>Select VM Instance</InputLabel>
                        <Select
                            value={selectedVm}
                            label="Select VM Instance"
                            onChange={(e) => setSelectedVm(e.target.value)}
                        >
                            {instances.map((i) => (
                                <MenuItem key={`${i.node}/${i.vmid}`} value={`${i.node}/${i.vmid}`}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                backgroundColor: i.status === 'running' ? '#34a853' : '#dadce0',
                                            }}
                                        />
                                        {i.name} ({i.node})
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </CardContent>
            </Card>

            {/* Snapshots Table */}
            {selectedVm && (
                <Card>
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CameraAltIcon sx={{ color: '#1a73e8' }} />
                        <Typography variant="h6" sx={{ fontSize: '0.9375rem' }}>
                            Snapshots for {selectedInstance?.name || 'VM'}
                        </Typography>
                        <Chip
                            label={`${snapshots.length} snapshot${snapshots.length !== 1 ? 's' : ''}`}
                            size="small"
                            sx={{ ml: 1 }}
                        />
                    </Box>

                    {snapshots.length === 0 && !loading ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <CameraAltIcon sx={{ fontSize: 48, color: '#dadce0', mb: 1 }} />
                            <Typography variant="body1" color="text.secondary">
                                No snapshots found for this instance.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: isDark ? '#35363a' : '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                            Name
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                            Description
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                            Date
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                            VM State
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {snapshots.map((snap) => (
                                        <TableRow
                                            key={snap.name}
                                            sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(232,234,237,0.08)' : '#f1f3f4' } }}
                                        >
                                            <TableCell>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {snap.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {snap.description || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {snap.snaptime
                                                        ? new Date(snap.snaptime * 1000).toLocaleString()
                                                        : '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={snap.vmstate ? 'Included' : 'Disk only'}
                                                    size="small"
                                                    variant="outlined"
                                                    color={snap.vmstate ? 'primary' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Delete snapshot">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(snap.name)}
                                                    >
                                                        <DeleteIcon fontSize="small" sx={{ color: '#ea4335' }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Card>
            )}

            {/* Create Snapshot Dialog */}
            <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create snapshot</DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <TextField
                        label="Snapshot name"
                        value={newSnapName}
                        onChange={(e) => setNewSnapName(e.target.value.replace(/\s/g, '-'))}
                        fullWidth
                        required
                        sx={{ mb: 2 }}
                        placeholder="snapshot-1"
                    />
                    <TextField
                        label="Description (optional)"
                        value={newSnapDesc}
                        onChange={(e) => setNewSnapDesc(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={!newSnapName}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack({ ...snack, open: false })}
                message={snack.message}
            />
        </Box>
    );
}
