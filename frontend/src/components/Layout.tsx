import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Autocomplete,
    Avatar,
    Box,
    Breadcrumbs,
    Chip,
    Divider,
    IconButton,
    Link as MuiLink,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    TextField,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloudIcon from '@mui/icons-material/Cloud';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Sidebar from './Sidebar';
import { useThemeMode } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import api from '../api/client';

const DRAWER_WIDTH = 256;
const COLLAPSED_WIDTH = 64;

// Human-readable breadcrumb labels
const labelMap: Record<string, string> = {
    compute: 'Compute Engine',
    instances: 'VM Instances',
    lxc: 'LXC Containers',
    monitoring: 'Monitoring',
    snapshots: 'Snapshots',
    backups: 'Backups',
    create: 'Create',
    admin: 'Administration',
    users: 'Users & Quotas',
    'machine-types': 'Machine Types',
    storage: 'Storage Config',
    dashboard: 'Dashboard',
    logs: 'Logs',
    networking: 'Networking',
    vpc: 'VPC Networks',
    operations: 'Operations',
    activity: 'Activity',
    shell: 'Cloud Shell',
    billing: 'Billing',
    alerts: 'Alerts',
};

export default function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { mode, toggleMode } = useThemeMode();
    const { user, isAdmin, logout } = useAuth();

    const pathParts = location.pathname.split('/').filter(Boolean);
    const menuOpen = Boolean(anchorEl);
    const currentDrawerWidth = sidebarCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

    const handleLogout = () => {
        setAnchorEl(null);
        logout();
        navigate('/login');
    };

    // Debounced search
    useEffect(() => {
        if (searchQuery.length < 2) { setSearchResults([]); return; }
        setSearchLoading(true);
        const timer = setTimeout(() => {
            api.get('/search', { params: { q: searchQuery } })
                .then((res) => setSearchResults(res.data.results || []))
                .catch(() => setSearchResults([]))
                .finally(() => setSearchLoading(false));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* ── AppBar ──────────────────────────────────────── */}
            <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
                <Toolbar sx={{ gap: 1 }}>
                    <IconButton
                        edge="start"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        sx={{ display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <CloudIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography
                        variant="h6"
                        noWrap
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '1.125rem',
                            color: 'text.secondary',
                            '&:hover': { color: 'text.primary' },
                            mr: 2,
                        }}
                    >
                        UCP VM
                    </Typography>

                    {/* Breadcrumbs */}
                    <Breadcrumbs
                        separator={<NavigateNextIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                        sx={{ display: { xs: 'none', sm: 'flex' } }}
                    >
                        {pathParts.map((part, i) => {
                            const path = '/' + pathParts.slice(0, i + 1).join('/');
                            const label = labelMap[part] || part.replace(/-/g, ' ');
                            const isLast = i === pathParts.length - 1;

                            if (isLast) {
                                return (
                                    <Typography
                                        key={path}
                                        variant="body2"
                                        sx={{ fontWeight: 500, color: 'text.primary', textTransform: 'capitalize' }}
                                    >
                                        {label}
                                    </Typography>
                                );
                            }
                            return (
                                <MuiLink
                                    key={path}
                                    component="button"
                                    variant="body2"
                                    underline="hover"
                                    onClick={() => navigate(path)}
                                    sx={{ color: 'text.secondary', textTransform: 'capitalize', cursor: 'pointer' }}
                                >
                                    {label}
                                </MuiLink>
                            );
                        })}
                    </Breadcrumbs>

                    <Box sx={{ flexGrow: 1 }} />

                    {/* Functional Search */}
                    <Autocomplete
                        freeSolo
                        options={searchResults}
                        loading={searchLoading}
                        getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.name} (${option.vmid})`}
                        onInputChange={(_, value) => setSearchQuery(value)}
                        onChange={(_, value) => {
                            if (value && typeof value !== 'string' && value.path) {
                                navigate(value.path);
                                setSearchQuery('');
                            }
                        }}
                        renderOption={(props, option: any) => (
                            <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    label={option.type?.toUpperCase()}
                                    size="small"
                                    sx={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        height: 20,
                                        bgcolor: option.type === 'vm' ? 'rgba(26,115,232,0.12)' : 'rgba(156,39,176,0.12)',
                                        color: option.type === 'vm' ? '#1a73e8' : '#9c27b0',
                                    }}
                                />
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{option.name}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        {option.node} · {option.vmid} · {option.status}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                placeholder="Search resources..."
                                InputProps={{
                                    ...params.InputProps,
                                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
                                }}
                            />
                        )}
                        sx={{
                            display: { xs: 'none', lg: 'block' },
                            width: 360,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 20,
                                backgroundColor: mode === 'dark' ? 'rgba(232,234,237,0.08)' : '#f1f3f4',
                                '& fieldset': { border: 'none' },
                                '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(232,234,237,0.12)' : '#e8eaed' },
                            },
                        }}
                    />

                    <Box sx={{ flexGrow: 1, display: { xs: 'block', lg: 'none' } }} />

                    {/* Dark mode toggle */}
                    <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
                        <IconButton onClick={toggleMode} sx={{ color: 'text.secondary' }}>
                            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                        </IconButton>
                    </Tooltip>

                    {/* User Avatar */}
                    {user && (
                        <>
                            <Tooltip title={user.name}>
                                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
                                    <Avatar
                                        src={user.picture || undefined}
                                        alt={user.name}
                                        sx={{ width: 32, height: 32, fontSize: '0.875rem' }}
                                    >
                                        {user.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                </IconButton>
                            </Tooltip>

                            <Menu
                                anchorEl={anchorEl}
                                open={menuOpen}
                                onClose={() => setAnchorEl(null)}
                                PaperProps={{
                                    elevation: 4,
                                    sx: {
                                        minWidth: 280,
                                        mt: 1,
                                        borderRadius: 3,
                                        overflow: 'visible',
                                        '&::before': {
                                            content: '""',
                                            display: 'block',
                                            position: 'absolute',
                                            top: 0,
                                            right: 20,
                                            width: 10,
                                            height: 10,
                                            bgcolor: 'background.paper',
                                            transform: 'translateY(-50%) rotate(45deg)',
                                            zIndex: 0,
                                        },
                                    },
                                }}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                {/* User Info Header */}
                                <Box sx={{ px: 2.5, py: 2, textAlign: 'center' }}>
                                    <Avatar
                                        src={user.picture || undefined}
                                        alt={user.name}
                                        sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, fontSize: '1.5rem' }}
                                    >
                                        {user.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                        {user.name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {user.email}
                                    </Typography>
                                    {isAdmin && (
                                        <Chip
                                            label="Admin"
                                            size="small"
                                            color="primary"
                                            sx={{ mt: 1, fontWeight: 600, fontSize: '0.7rem' }}
                                        />
                                    )}
                                </Box>

                                <Divider />

                                <MenuItem onClick={() => { setAnchorEl(null); }}>
                                    <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Manage profile</ListItemText>
                                </MenuItem>

                                {isAdmin && (
                                    <MenuItem onClick={() => { setAnchorEl(null); navigate('/admin/users'); }}>
                                        <ListItemIcon><AdminPanelSettingsIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText>Admin Panel</ListItemText>
                                    </MenuItem>
                                )}

                                <Divider />

                                <MenuItem onClick={handleLogout}>
                                    <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Sign out</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    )}
                </Toolbar>
            </AppBar>

            {/* ── Sidebar ─────────────────────────────────────── */}
            <Sidebar
                drawerWidth={DRAWER_WIDTH}
                collapsedWidth={COLLAPSED_WIDTH}
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* ── Main Content ────────────────────────────────── */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { md: `calc(100% - ${currentDrawerWidth}px)` },
                    ml: { md: `${currentDrawerWidth}px` },
                    mt: '64px',
                    p: 3,
                    backgroundColor: 'background.default',
                    minHeight: 'calc(100vh - 64px)',
                    transition: 'margin-left 225ms cubic-bezier(0.4, 0, 0.6, 1), width 225ms cubic-bezier(0.4, 0, 0.6, 1)',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
