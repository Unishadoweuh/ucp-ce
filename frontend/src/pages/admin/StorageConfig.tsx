import { useEffect, useState } from 'react';
import {
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
    Snackbar,
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
import SaveIcon from '@mui/icons-material/Save';
import StorageIcon from '@mui/icons-material/Storage';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import axios from 'axios';

interface StorageConfigRow {
    id: number;
    storage_name: string;
    role: string;
    node: string;
    description: string | null;
}

export default function AdminStorageConfig() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [configs, setConfigs] = useState<StorageConfigRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState({ storage_name: '', role: 'vm_storage', node: '', description: '' });
    const [snack, setSnack] = useState({ open: false, message: '' });

    const load = () => {
        setLoading(true);
        axios.get('/api/admin/storage-configs')
            .then((res) => setConfigs(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleCreate = async () => {
        try {
            await axios.post('/api/admin/storage-configs', form);
            setSnack({ open: true, message: 'Storage config created' });
            setDialog(false);
            load();
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to create' });
        }
    };

    const handleDelete = async (sc: StorageConfigRow) => {
        if (!confirm(`Delete mapping for "${sc.storage_name}"?`)) return;
        try {
            await axios.delete(`/api/admin/storage-configs/${sc.id}`);
            setSnack({ open: true, message: `Deleted ${sc.storage_name}` });
            load();
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to delete' });
        }
    };

    const roleIcon = (role: string) =>
        role === 'vm_storage' ? <StorageIcon fontSize="small" /> : <AcUnitIcon fontSize="small" />;

    const roleColor = (role: string): 'primary' | 'secondary' =>
        role === 'vm_storage' ? 'primary' : 'secondary';

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Storage Configuration</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                        setForm({ storage_name: '', role: 'vm_storage', node: '', description: '' });
                        setDialog(true);
                    }}
                >
                    Add Mapping
                </Button>
            </Box>

            <Card>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: isDark ? '#35363a' : '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Storage Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Role</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Node</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Description</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {configs.map((sc) => (
                                    <TableRow key={sc.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(232,234,237,0.08)' : '#f1f3f4' } }}>
                                        <TableCell>
                                            <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: '"Roboto Mono", monospace' }}>
                                                {sc.storage_name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={roleIcon(sc.role)}
                                                label={sc.role === 'vm_storage' ? 'VM Storage' : 'Cold Storage'}
                                                size="small"
                                                color={roleColor(sc.role)}
                                                sx={{ fontWeight: 500 }}
                                            />
                                        </TableCell>
                                        <TableCell>{sc.node}</TableCell>
                                        <TableCell sx={{ color: 'text.secondary' }}>{sc.description || '—'}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Delete">
                                                <IconButton size="small" onClick={() => handleDelete(sc)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {configs.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                                            No storage configs defined yet. Add one to categorize your Proxmox storages.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Storage Mapping</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Storage Name (Proxmox ID)"
                            value={form.storage_name}
                            onChange={(e) => setForm({ ...form, storage_name: e.target.value })}
                            fullWidth
                            placeholder="local-lvm"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select value={form.role} label="Role" onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                <MenuItem value="vm_storage">VM Storage (SSD/NVMe)</MenuItem>
                                <MenuItem value="cold_storage">Cold Storage (Archives/Backups)</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Node"
                            value={form.node}
                            onChange={(e) => setForm({ ...form, node: e.target.value })}
                            fullWidth
                            placeholder="pve-node-1"
                        />
                        <TextField
                            label="Description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleCreate}>Create</Button>
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
