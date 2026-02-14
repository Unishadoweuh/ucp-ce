import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Switch,
    TextField,
    Typography,
    Alert,
    Snackbar,
    Chip,
    Collapse,
    IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import {
    fetchNodes,
    fetchMachineTypes,
    fetchImages,
    fetchStorage,
    createInstance,
} from '../api/client';

interface Node {
    node: string;
    status: string;
}

interface MachineType {
    id: number;
    name: string;
    series: string;
    vcpus: number;
    memory_mb: number;
    description: string;
}

interface TemplateImage {
    vmid: number;
    name: string;
    node: string;
}

interface StoragePool {
    storage: string;
    node: string;
    type: string;
    total_gb: number;
    avail_gb: number;
}

export default function CreateInstance() {
    const navigate = useNavigate();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Form state
    const [name, setName] = useState('');
    const [node, setNode] = useState('');
    const [series, setSeries] = useState('standard');
    const [machineType, setMachineType] = useState('');
    const [templateVmid, setTemplateVmid] = useState<number | ''>('');
    const [storage, setStorage] = useState('local-lvm');
    const [diskSize, setDiskSize] = useState(32);
    const [startAfter, setStartAfter] = useState(true);
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');

    // Data
    const [nodes, setNodes] = useState<Node[]>([]);
    const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
    const [images, setImages] = useState<TemplateImage[]>([]);
    const [storages, setStorages] = useState<StoragePool[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [snack, setSnack] = useState({ open: false, message: '' });

    // Sections open/closed
    const [openSections, setOpenSections] = useState({
        machine: true,
        bootDisk: true,
        networking: false,
        management: false,
    });

    useEffect(() => {
        Promise.all([
            fetchNodes().catch(() => ({ data: [] })),
            fetchMachineTypes().catch(() => ({ data: [] })),
            fetchImages().catch(() => ({ data: [] })),
            fetchStorage().catch(() => ({ data: [] })),
        ]).then(([nodesRes, mtRes, imgRes, stRes]) => {
            setNodes(nodesRes.data);
            setMachineTypes(mtRes.data);
            setImages(imgRes.data);
            setStorages(stRes.data);
            // Set defaults
            if (nodesRes.data.length > 0) setNode(nodesRes.data[0].node);
            if (mtRes.data.length > 0) setMachineType(mtRes.data[0].name);
        });
    }, []);

    const selectedMT = machineTypes.find((m) => m.name === machineType);
    const seriesList = [...new Set(machineTypes.map((m) => m.series))];
    const filteredTypes = machineTypes.filter((m) => m.series === series);
    const filteredImages = node ? images.filter((i) => i.node === node) : images;
    const filteredStorages = node ? storages.filter((s) => s.node === node) : storages;

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const handleSubmit = async () => {
        if (!name || !node || !machineType || !templateVmid) {
            setError('Please fill in all required fields.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await createInstance({
                name,
                node,
                machine_type: machineType,
                template_vmid: templateVmid as number,
                boot_disk: { storage, size_gb: diskSize },
                start_after_create: startAfter,
                description,
                tags,
            });
            setSnack({ open: true, message: `Instance "${name}" is being created...` });
            setTimeout(() => navigate('/compute/instances'), 1500);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create instance');
        } finally {
            setLoading(false);
        }
    };

    // ── Section header component ────────────────────────────────
    const SectionHeader = ({
        title,
        sectionKey,
        icon,
    }: {
        title: string;
        sectionKey: keyof typeof openSections;
        icon: React.ReactNode;
    }) => (
        <Box
            onClick={() => toggleSection(sectionKey)}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                py: 1.5,
                px: 2.5,
                '&:hover': { backgroundColor: isDark ? 'rgba(232,234,237,0.08)' : '#f8f9fa' },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {icon}
                <Typography variant="h6" sx={{ fontSize: '0.9375rem' }}>
                    {title}
                </Typography>
            </Box>
            <IconButton size="small">
                {openSections[sectionKey] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
        </Box>
    );

    return (
        <Box sx={{ maxWidth: 900 }}>
            {/* ── Header ──────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <IconButton onClick={() => navigate('/compute/instances')}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4">Create an instance</Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* ── Name & Region ───────────────────────────────── */}
            <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                fullWidth
                                required
                                helperText="Lowercase letters, numbers, and hyphens only"
                                placeholder="my-instance"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Region (Node)</InputLabel>
                                <Select value={node} label="Region (Node)" onChange={(e) => setNode(e.target.value)}>
                                    {nodes.map((n) => (
                                        <MenuItem key={n.node} value={n.node}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        backgroundColor: n.status === 'online' ? '#34a853' : '#ea4335',
                                                    }}
                                                />
                                                {n.node}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* ── Machine Configuration ───────────────────────── */}
            <Card sx={{ mb: 2 }}>
                <SectionHeader title="Machine configuration" sectionKey="machine" icon={<MemoryIcon sx={{ color: '#1a73e8' }} />} />
                <Collapse in={openSections.machine}>
                    <Divider />
                    <CardContent sx={{ p: 2.5 }}>
                        {/* Series selector */}
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            Series
                        </Typography>
                        <RadioGroup
                            row
                            value={series}
                            onChange={(e) => {
                                setSeries(e.target.value);
                                const first = machineTypes.find((m) => m.series === e.target.value);
                                if (first) setMachineType(first.name);
                            }}
                            sx={{ mb: 2 }}
                        >
                            {seriesList.map((s) => (
                                <FormControlLabel
                                    key={s}
                                    value={s}
                                    control={<Radio size="small" />}
                                    label={
                                        <Chip
                                            label={s.charAt(0).toUpperCase() + s.slice(1)}
                                            size="small"
                                            variant={series === s ? 'filled' : 'outlined'}
                                            color={series === s ? 'primary' : 'default'}
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    }
                                    sx={{ mr: 1 }}
                                />
                            ))}
                        </RadioGroup>

                        {/* Machine type selector */}
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            Machine type
                        </Typography>
                        <FormControl fullWidth>
                            <Select
                                value={machineType}
                                onChange={(e) => setMachineType(e.target.value)}
                            >
                                {filteredTypes.map((mt) => (
                                    <MenuItem key={mt.name} value={mt.name}>
                                        <Box sx={{ width: '100%' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {mt.name}
                                                </Typography>
                                                <Typography variant="body2">
                                                    {mt.vcpus} vCPU · {(mt.memory_mb / 1024).toFixed(0)} GB
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                {mt.description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Summary */}
                        {selectedMT && (
                            <Box
                                sx={{
                                    mt: 2,
                                    p: 1.5,
                                    backgroundColor: isDark ? 'rgba(138,180,248,0.12)' : '#e8f0fe',
                                    borderRadius: 1,
                                    display: 'flex',
                                    gap: 3,
                                }}
                            >
                                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                                    {selectedMT.vcpus} vCPU
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                                    {(selectedMT.memory_mb / 1024).toFixed(0)} GB memory
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Collapse>
            </Card>

            {/* ── Boot Disk ───────────────────────────────────── */}
            <Card sx={{ mb: 2 }}>
                <SectionHeader title="Boot disk" sectionKey="bootDisk" icon={<StorageIcon sx={{ color: '#1a73e8' }} />} />
                <Collapse in={openSections.bootDisk}>
                    <Divider />
                    <CardContent sx={{ p: 2.5 }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <FormControl fullWidth required>
                                    <InputLabel>OS Image (Template)</InputLabel>
                                    <Select
                                        value={templateVmid}
                                        label="OS Image (Template)"
                                        onChange={(e) => setTemplateVmid(e.target.value as number)}
                                    >
                                        {filteredImages.length === 0 && (
                                            <MenuItem disabled value="">
                                                No templates found — create a VM template in Proxmox first
                                            </MenuItem>
                                        )}
                                        {filteredImages.map((img) => (
                                            <MenuItem key={img.vmid} value={img.vmid}>
                                                {img.name} (VMID: {img.vmid})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Storage</InputLabel>
                                    <Select value={storage} label="Storage" onChange={(e) => setStorage(e.target.value)}>
                                        {filteredStorages.map((s) => (
                                            <MenuItem key={`${s.node}-${s.storage}`} value={s.storage}>
                                                {s.storage} ({s.type}) — {s.avail_gb} GB free
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Boot disk size (GB)"
                                    type="number"
                                    value={diskSize}
                                    onChange={(e) => setDiskSize(Number(e.target.value))}
                                    fullWidth
                                    inputProps={{ min: 10, max: 2048 }}
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Collapse>
            </Card>

            {/* ── Management ──────────────────────────────────── */}
            <Card sx={{ mb: 3 }}>
                <Box sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontSize: '0.9375rem', mb: 2 }}>
                        Management
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                fullWidth
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Tags (comma-separated)"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                fullWidth
                                placeholder="web, production"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch checked={startAfter} onChange={(e) => setStartAfter(e.target.checked)} />
                                }
                                label="Start instance after creation"
                            />
                        </Grid>
                    </Grid>
                </Box>
            </Card>

            {/* ── Actions ─────────────────────────────────────── */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/compute/instances')}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading || !name || !node || !machineType || !templateVmid}
                    sx={{ minWidth: 120 }}
                >
                    {loading ? 'Creating...' : 'Create'}
                </Button>
            </Box>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack({ ...snack, open: false })}
                message={snack.message}
            />
        </Box>
    );
}
