import { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Alert,
    Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RestoreIcon from '@mui/icons-material/Restore';
import { fetchInstances, fetchBackups, restoreBackup } from '../api/client';

interface Instance {
    vmid: number;
    name: string;
    node: string;
    status: string;
}

interface Backup {
    volid: string;
    ctime: number;
    size: number;
    storage: string;
    format: string;
    notes?: string;
}

export default function Backups() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [instances, setInstances] = useState<Instance[]>([]);
    const [selectedVm, setSelectedVm] = useState('');
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);
    const [restoreDialog, setRestoreDialog] = useState<Backup | null>(null);
    const [snack, setSnack] = useState({ open: false, message: '' });

    useEffect(() => {
        fetchInstances().then((res) => setInstances(res.data)).catch(() => { });
    }, []);

    const loadBackups = useCallback((vmKey: string) => {
        if (!vmKey) return;
        const [node, vmid] = vmKey.split('/');
        setLoading(true);
        fetchBackups(node, parseInt(vmid, 10))
            .then((res) => setBackups(res.data))
            .catch(() => setBackups([]))
            .finally(() => setLoading(false));
    }, []);

    const handleSelectVm = (val: string) => {
        setSelectedVm(val);
        loadBackups(val);
    };

    const handleRestore = async () => {
        if (!restoreDialog || !selectedVm) return;
        const [node, vmid] = selectedVm.split('/');
        try {
            await restoreBackup(node, parseInt(vmid, 10), restoreDialog.volid);
            setSnack({ open: true, message: `Restore started for ${restoreDialog.volid}` });
            setRestoreDialog(null);
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Restore failed' });
        }
    };

    const formatDate = (ts: number) => new Date(ts * 1000).toLocaleString();
    const formatSize = (bytes: number) => `${(bytes / (1024 ** 3)).toFixed(2)} GB`;

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>Backups</Typography>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <FormControl fullWidth size="small">
                        <InputLabel>Select VM Instance</InputLabel>
                        <Select
                            value={selectedVm}
                            label="Select VM Instance"
                            onChange={(e) => handleSelectVm(e.target.value)}
                        >
                            {instances.map((inst) => (
                                <MenuItem key={`${inst.node}/${inst.vmid}`} value={`${inst.node}/${inst.vmid}`}>
                                    {inst.name} (VMID: {inst.vmid}) — {inst.node}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </CardContent>
            </Card>

            {selectedVm && (
                <Card>
                    <CardContent>
                        {loading ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
                                Loading backups...
                            </Typography>
                        ) : backups.length === 0 ? (
                            <Alert severity="info">No backups found for this VM.</Alert>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: isDark ? '#35363a' : '#f8f9fa' }}>
                                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Volume ID</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Size</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Storage</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {backups.map((backup) => (
                                            <TableRow
                                                key={backup.volid}
                                                sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(232,234,237,0.08)' : '#f1f3f4' } }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: '"Roboto Mono", monospace', fontSize: '0.8rem' }}>
                                                        {backup.volid}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{formatDate(backup.ctime)}</TableCell>
                                                <TableCell>{formatSize(backup.size)}</TableCell>
                                                <TableCell>
                                                    <Chip label={backup.storage} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        size="small"
                                                        startIcon={<RestoreIcon />}
                                                        onClick={() => setRestoreDialog(backup)}
                                                        variant="outlined"
                                                    >
                                                        Restore
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Restore Dialog */}
            <Dialog open={!!restoreDialog} onClose={() => setRestoreDialog(null)}>
                <DialogTitle>Restore from backup?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will restore the VM from backup <strong>{restoreDialog?.volid}</strong>.
                        The current VM state will be overwritten. This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRestoreDialog(null)}>Cancel</Button>
                    <Button onClick={handleRestore} color="primary" variant="contained">Restore</Button>
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
