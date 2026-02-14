import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
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
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';

interface MachineType {
    id: number;
    name: string;
    series: string;
    vcpus: number;
    memory_mb: number;
    description: string | null;
}

export default function AdminMachineTypes() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [types, setTypes] = useState<MachineType[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; data?: MachineType } | null>(null);
    const [form, setForm] = useState({ name: '', series: 'standard', vcpus: 1, memory_mb: 1024, description: '' });
    const [snack, setSnack] = useState({ open: false, message: '' });

    const load = () => {
        setLoading(true);
        axios.get('/api/machine-types')
            .then((res) => setTypes(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const openCreate = () => {
        setForm({ name: '', series: 'standard', vcpus: 1, memory_mb: 1024, description: '' });
        setDialog({ mode: 'create' });
    };

    const openEdit = (mt: MachineType) => {
        setForm({ name: mt.name, series: mt.series, vcpus: mt.vcpus, memory_mb: mt.memory_mb, description: mt.description || '' });
        setDialog({ mode: 'edit', data: mt });
    };

    const handleSave = async () => {
        try {
            if (dialog?.mode === 'create') {
                await axios.post('/api/machine-types', null, { params: form });
            } else if (dialog?.data) {
                await axios.put(`/api/machine-types/${dialog.data.id}`, null, { params: form });
            }
            setSnack({ open: true, message: `Machine type ${dialog?.mode === 'create' ? 'created' : 'updated'}` });
            setDialog(null);
            load();
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to save' });
        }
    };

    const handleDelete = async (mt: MachineType) => {
        if (!confirm(`Delete "${mt.name}"?`)) return;
        try {
            await axios.delete(`/api/machine-types/${mt.id}`);
            setSnack({ open: true, message: `Deleted ${mt.name}` });
            load();
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to delete' });
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Machine Types</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Add Machine Type
                </Button>
            </Box>

            <Card>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: isDark ? '#35363a' : '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Series</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>vCPUs</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Memory (MB)</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Description</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {types.map((mt) => (
                                    <TableRow key={mt.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(232,234,237,0.08)' : '#f1f3f4' } }}>
                                        <TableCell>
                                            <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: '"Roboto Mono", monospace' }}>
                                                {mt.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{mt.series}</TableCell>
                                        <TableCell align="right">{mt.vcpus}</TableCell>
                                        <TableCell align="right">{mt.memory_mb}</TableCell>
                                        <TableCell sx={{ color: 'text.secondary' }}>{mt.description || '—'}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => openEdit(mt)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" onClick={() => handleDelete(mt)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {types.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                                            No machine types defined yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>{dialog?.mode === 'create' ? 'Add Machine Type' : 'Edit Machine Type'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            fullWidth
                            placeholder="ucp-standard-2"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Series</InputLabel>
                            <Select value={form.series} label="Series" onChange={(e) => setForm({ ...form, series: e.target.value })}>
                                <MenuItem value="standard">Standard</MenuItem>
                                <MenuItem value="highmem">High Memory</MenuItem>
                                <MenuItem value="highcpu">High CPU</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="vCPUs"
                            type="number"
                            value={form.vcpus}
                            onChange={(e) => setForm({ ...form, vcpus: parseInt(e.target.value) || 1 })}
                            fullWidth
                        />
                        <TextField
                            label="Memory (MB)"
                            type="number"
                            value={form.memory_mb}
                            onChange={(e) => setForm({ ...form, memory_mb: parseInt(e.target.value) || 1024 })}
                            fullWidth
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
                    <Button onClick={() => setDialog(null)}>Cancel</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                        {dialog?.mode === 'create' ? 'Create' : 'Save'}
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
