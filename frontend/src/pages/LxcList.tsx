import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Typography,
    IconButton,
    Tooltip,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Drawer,
    Snackbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StatusChip from '../components/StatusChip';
import { fetchLxcList, lxcAction, deleteLxc } from '../api/client';
import CreateLxc from './CreateLxc';

interface LxcRow {
    vmid: number;
    name: string;
    node: string;
    status: string;
    vcpus: number;
    memory_mb: number;
    disk_gb: number;
    uptime: number;
    tags: string;
}

function formatUptime(seconds: number): string {
    if (seconds === 0) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export default function LxcList() {
    const navigate = useNavigate();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [containers, setContainers] = useState<LxcRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<GridRowSelectionModel>([]);
    const [deleteDialog, setDeleteDialog] = useState<LxcRow | null>(null);
    const [snack, setSnack] = useState({ open: false, message: '' });
    const [createOpen, setCreateOpen] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        fetchLxcList()
            .then((res) => {
                setContainers(res.data);
                setError('');
            })
            .catch((err) => setError(err.response?.data?.detail || 'Failed to load containers'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, [load]);

    const handleAction = async (node: string, vmid: number, action: string) => {
        try {
            await lxcAction(node, vmid, action);
            setSnack({ open: true, message: `${action} sent to CT ${vmid}` });
            setTimeout(load, 2000);
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || `Failed to ${action}` });
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog) return;
        try {
            await deleteLxc(deleteDialog.node, deleteDialog.vmid);
            setSnack({ open: true, message: `Container ${deleteDialog.name} deleted` });
            setDeleteDialog(null);
            setTimeout(load, 1000);
        } catch (err: any) {
            setSnack({ open: true, message: err.response?.data?.detail || 'Failed to delete' });
        }
    };

    const accentBlue = isDark ? '#8ab4f8' : '#1a73e8';
    const accentGreen = isDark ? '#81c995' : '#34a853';
    const mutedText = isDark ? '#9aa0a6' : '#5f6368';
    const borderColor = isDark ? '#3c4043' : '#dadce0';
    const rowHover = isDark ? 'rgba(232,234,237,0.08)' : '#f1f3f4';
    const headerBg = isDark ? '#35363a' : '#f8f9fa';
    const cellBorder = isDark ? '#3c4043' : '#f1f3f4';

    const columns: GridColDef[] = [
        {
            field: 'status',
            headerName: '',
            width: 12,
            renderCell: (params) => (
                <Box
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor:
                            params.value === 'running' ? accentGreen : params.value === 'paused' ? '#fbbc04' : (isDark ? '#5f6368' : '#dadce0'),
                        mt: 2,
                    }}
                />
            ),
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
        },
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 180,
            renderCell: (params) => (
                <Typography
                    variant="body1"
                    sx={{ color: accentBlue, fontWeight: 500, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                >
                    {params.value}
                </Typography>
            ),
        },
        {
            field: 'node',
            headerName: 'Zone',
            width: 130,
        },
        {
            field: 'statusChip',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => <StatusChip status={params.row.status} />,
            sortable: false,
        },
        {
            field: 'vcpus',
            headerName: 'vCPUs',
            width: 80,
            align: 'right',
            headerAlign: 'right',
        },
        {
            field: 'memory_mb',
            headerName: 'Memory',
            width: 100,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) => `${(params.value / 1024).toFixed(1)} GB`,
        },
        {
            field: 'disk_gb',
            headerName: 'Disk',
            width: 80,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) => `${params.value} GB`,
        },
        {
            field: 'uptime',
            headerName: 'Uptime',
            width: 90,
            renderCell: (params) => formatUptime(params.value),
        },
        {
            field: 'actions',
            headerName: '',
            width: 180,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => {
                const row = params.row as LxcRow;
                const isRunning = row.status === 'running';
                return (
                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                        {!isRunning && (
                            <Tooltip title="Start">
                                <IconButton size="small" onClick={() => handleAction(row.node, row.vmid, 'start')}>
                                    <PlayArrowIcon fontSize="small" sx={{ color: accentGreen }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {isRunning && (
                            <>
                                <Tooltip title="Stop">
                                    <IconButton size="small" onClick={() => handleAction(row.node, row.vmid, 'shutdown')}>
                                        <StopIcon fontSize="small" sx={{ color: '#ea4335' }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Reboot">
                                    <IconButton size="small" onClick={() => handleAction(row.node, row.vmid, 'reboot')}>
                                        <RestartAltIcon fontSize="small" sx={{ color: '#fbbc04' }} />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                        <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeleteDialog(row)}>
                                <DeleteIcon fontSize="small" sx={{ color: mutedText }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Console (Proxmox)">
                            <IconButton size="small" component="a" href="#" target="_blank">
                                <OpenInNewIcon fontSize="small" sx={{ color: mutedText }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                );
            },
        },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h4">LXC Containers</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small">
                        Refresh
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                        Create Container
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {error} — Configure your Proxmox connection to see containers.
                </Alert>
            )}

            <Box
                sx={{
                    backgroundColor: 'background.paper',
                    border: `1px solid ${borderColor}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                }}
            >
                <DataGrid
                    rows={containers}
                    columns={columns}
                    getRowId={(row) => `${row.node}-${row.vmid}`}
                    loading={loading}
                    checkboxSelection
                    disableRowSelectionOnClick
                    onRowSelectionModelChange={setSelected}
                    rowSelectionModel={selected}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                    autoHeight
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: headerBg,
                            borderBottom: `1px solid ${borderColor}`,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: mutedText,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                        },
                        '& .MuiDataGrid-row': {
                            '&:hover': { backgroundColor: rowHover },
                            fontSize: '0.875rem',
                        },
                        '& .MuiDataGrid-cell': {
                            borderBottom: `1px solid ${cellBorder}`,
                            py: 1,
                        },
                        '& .MuiDataGrid-footerContainer': {
                            borderTop: `1px solid ${borderColor}`,
                        },
                        '& .MuiCheckbox-root': {
                            color: isDark ? '#5f6368' : '#dadce0',
                            '&.Mui-checked': { color: accentBlue },
                        },
                    }}
                />
            </Box>

            <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
                <DialogTitle>Delete container?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete <strong>{deleteDialog?.name}</strong> (CTID: {deleteDialog?.vmid})?
                        This action cannot be undone. The container must be stopped first.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack({ ...snack, open: false })}
                message={snack.message}
            />

            {/* Create Drawer */}
            <Drawer
                anchor="right"
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 680 }, p: 0 } }}
            >
                <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
                    <CreateLxc onSuccess={() => { setCreateOpen(false); load(); }} onCancel={() => setCreateOpen(false)} embedded />
                </Box>
            </Drawer>
        </Box>
    );
}
