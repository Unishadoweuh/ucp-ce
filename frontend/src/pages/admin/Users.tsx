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
    IconButton,
    Snackbar,
    TextField,
    Tooltip,
    Typography,
    Avatar,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import axios from 'axios';

interface UserRow {
    id: number;
    email: string;
    name: string;
    picture: string | null;
    role: string;
    status: string;
    quota?: {
        id: number;
        user_id: number;
        max_vcpus: number;
        max_ram_gb: number;
        max_disk_gb: number;
        allowed_networks: string;
    } | null;
}

export default function AdminUsers() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editDialog, setEditDialog] = useState<UserRow | null>(null);
    const [quotaForm, setQuotaForm] = useState({ max_vcpus: 0, max_ram_gb: 0, max_disk_gb: 0, allowed_networks: '' });
    const [snack, setSnack] = useState({ open: false, message: '' });

    const load = () => {
        setLoading(true);
        axios.get('/api/admin/users')
            .then((res) => setUsers(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleEditQuota = (user: UserRow) => {
        setEditDialog(user);
        setQuotaForm({
            max_vcpus: user.quota?.max_vcpus || 8,
            max_ram_gb: user.quota?.max_ram_gb || 16,
            max_disk_gb: user.quota?.max_disk_gb || 200,
            allowed_networks: user.quota?.allowed_networks || '',
        });
    };

    const handleSaveQuota = async () => {
        if (!editDialog) return;
        try {
            await axios.put(`/api/admin/users/${editDialog.id}/quota`, quotaForm);
            setSnack({ open: true, message: `Quota updated for ${editDialog.name}` });
            setEditDialog(null);
            load();
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to update quota' });
        }
    };

    const handleToggleRole = async (user: UserRow) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        try {
            await axios.put(`/api/admin/users/${user.id}/role`, { role: newRole });
            setSnack({ open: true, message: `${user.name} is now ${newRole}` });
            load();
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to update role' });
        }
    };

    const handleStatus = async (user: UserRow, newStatus: string) => {
        try {
            await axios.put(`/api/admin/users/${user.id}/status`, { status: newStatus });
            setSnack({ open: true, message: `${user.name} is now ${newStatus}` });
            load();
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to update status' });
        }
    };

    const accentBlue = isDark ? '#8ab4f8' : '#1a73e8';
    const borderColor = isDark ? '#3c4043' : '#dadce0';
    const headerBg = isDark ? '#35363a' : '#f8f9fa';

    const columns: GridColDef[] = [
        {
            field: 'avatar',
            headerName: '',
            width: 50,
            sortable: false,
            renderCell: (params) => (
                <Avatar src={params.row.picture || undefined} sx={{ width: 28, height: 28, mt: 1 }}>
                    {params.row.name.charAt(0)}
                </Avatar>
            ),
        },
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
        { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
        {
            field: 'role',
            headerName: 'Role',
            width: 120,
            renderCell: (params) => (
                <Chip
                    icon={params.value === 'admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                    label={params.value}
                    size="small"
                    color={params.value === 'admin' ? 'primary' : 'default'}
                    sx={{ fontWeight: 500, textTransform: 'capitalize' }}
                />
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => {
                const color = params.value === 'approved' ? '#34a853' : params.value === 'pending' ? '#fbbc04' : '#ea4335';
                return (
                    <Chip
                        label={params.value}
                        size="small"
                        sx={{
                            fontWeight: 600, textTransform: 'capitalize', fontSize: '0.7rem',
                            bgcolor: `${color}20`, color,
                        }}
                    />
                );
            },
        },
        {
            field: 'quota_vcpus',
            headerName: 'Max vCPUs',
            width: 110,
            align: 'right',
            headerAlign: 'right',
            valueGetter: (_value, row) => row.quota?.max_vcpus ?? '—',
        },
        {
            field: 'quota_ram',
            headerName: 'Max RAM (GB)',
            width: 130,
            align: 'right',
            headerAlign: 'right',
            valueGetter: (_value, row) => row.quota?.max_ram_gb ?? '—',
        },
        {
            field: 'quota_disk',
            headerName: 'Max Disk (GB)',
            width: 130,
            align: 'right',
            headerAlign: 'right',
            valueGetter: (_value, row) => row.quota?.max_disk_gb ?? '—',
        },
        {
            field: 'actions',
            headerName: '',
            width: 180,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Edit Quota">
                        <IconButton size="small" onClick={() => handleEditQuota(params.row)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={params.row.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}>
                        <IconButton size="small" onClick={() => handleToggleRole(params.row)}>
                            {params.row.role === 'admin' ? <PersonIcon fontSize="small" /> : <AdminPanelSettingsIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    {params.row.status === 'pending' && (
                        <>
                            <Tooltip title="Approve">
                                <IconButton size="small" onClick={() => handleStatus(params.row, 'approved')} sx={{ color: '#34a853' }}>
                                    <CheckCircleIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                                <IconButton size="small" onClick={() => handleStatus(params.row, 'rejected')} sx={{ color: '#ea4335' }}>
                                    <BlockIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                    {params.row.status === 'rejected' && (
                        <Tooltip title="Re-approve">
                            <IconButton size="small" onClick={() => handleStatus(params.row, 'approved')} sx={{ color: '#34a853' }}>
                                <CheckCircleIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            ),
        },
    ];

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>Users & Quotas</Typography>

            <Card>
                <CardContent sx={{ p: 0 }}>
                    <DataGrid
                        rows={users}
                        columns={columns}
                        loading={loading}
                        autoHeight
                        pageSizeOptions={[10, 25]}
                        disableRowSelectionOnClick
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: headerBg,
                                borderBottom: `1px solid ${borderColor}`,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                            },
                            '& .MuiDataGrid-cell': {
                                borderBottom: `1px solid ${isDark ? '#3c4043' : '#f1f3f4'}`,
                            },
                        }}
                    />
                </CardContent>
            </Card>

            {/* Edit Quota Dialog */}
            <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Quota — {editDialog?.name}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Max vCPUs"
                            type="number"
                            value={quotaForm.max_vcpus}
                            onChange={(e) => setQuotaForm({ ...quotaForm, max_vcpus: parseInt(e.target.value) || 0 })}
                            fullWidth
                        />
                        <TextField
                            label="Max RAM (GB)"
                            type="number"
                            value={quotaForm.max_ram_gb}
                            onChange={(e) => setQuotaForm({ ...quotaForm, max_ram_gb: parseInt(e.target.value) || 0 })}
                            fullWidth
                        />
                        <TextField
                            label="Max Disk (GB)"
                            type="number"
                            value={quotaForm.max_disk_gb}
                            onChange={(e) => setQuotaForm({ ...quotaForm, max_disk_gb: parseInt(e.target.value) || 0 })}
                            fullWidth
                        />
                        <TextField
                            label="Allowed Networks (comma-separated bridge IDs)"
                            value={quotaForm.allowed_networks}
                            onChange={(e) => setQuotaForm({ ...quotaForm, allowed_networks: e.target.value })}
                            fullWidth
                            placeholder="vmbr0,vmbr1"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog(null)}>Cancel</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveQuota}>Save</Button>
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
