import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Collapse,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Toolbar,
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ComputerIcon from '@mui/icons-material/Computer';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import BackupIcon from '@mui/icons-material/Backup';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ArticleIcon from '@mui/icons-material/Article';
import TerminalIcon from '@mui/icons-material/Terminal';
import PeopleIcon from '@mui/icons-material/People';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LanIcon from '@mui/icons-material/Lan';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useAuth } from '../AuthContext';

interface SidebarProps {
    drawerWidth: number;
    collapsedWidth: number;
    mobileOpen: boolean;
    onClose: () => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
}

const mainNav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
];

const computeNav: NavItem[] = [
    { label: 'VM Instances', path: '/compute/instances', icon: <ComputerIcon /> },
    { label: 'LXC Containers', path: '/compute/lxc', icon: <ViewInArIcon /> },
    { label: 'Cloud Shell', path: '/compute/shell', icon: <TerminalIcon /> },
    { label: 'Monitoring', path: '/compute/monitoring', icon: <MonitorHeartIcon /> },
    { label: 'Logs', path: '/compute/logs', icon: <ArticleIcon /> },
    { label: 'Snapshots', path: '/compute/snapshots', icon: <CameraAltIcon /> },
    { label: 'Backups', path: '/compute/backups', icon: <BackupIcon /> },
];

const networkNav: NavItem[] = [
    { label: 'VPC Networks', path: '/networking/vpc', icon: <LanIcon /> },
];

const opsNav: NavItem[] = [
    { label: 'Activity', path: '/operations/activity', icon: <HistoryIcon /> },
    { label: 'Alerts', path: '/operations/alerts', icon: <NotificationsActiveIcon /> },
];

const billingNav: NavItem[] = [
    { label: 'Billing', path: '/billing', icon: <AttachMoneyIcon /> },
];

const adminNav: NavItem[] = [
    { label: 'Users & Quotas', path: '/admin/users', icon: <PeopleIcon /> },
    { label: 'Machine Types', path: '/admin/machine-types', icon: <MemoryIcon /> },
    { label: 'Storage Config', path: '/admin/storage', icon: <StorageIcon /> },
];

export default function Sidebar({ drawerWidth, collapsedWidth, mobileOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Collapsible section state
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        overview: true,
        compute: true,
        networking: true,
        operations: true,
        billing: true,
        admin: true,
    });

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isActive = (path: string) => location.pathname.startsWith(path);

    const currentWidth = collapsed ? collapsedWidth : drawerWidth;

    const renderSection = (title: string, items: NavItem[], sectionKey: string) => (
        <Box sx={{ mt: 0.5 }}>
            {!collapsed ? (
                <Box
                    onClick={() => toggleSection(sectionKey)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 0.5,
                        cursor: 'pointer',
                        borderRadius: 1,
                        mx: 0.5,
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: '0.6875rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}
                    >
                        {title}
                    </Typography>
                    <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
                        {openSections[sectionKey] ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                </Box>
            ) : (
                <Divider sx={{ my: 0.5, mx: 1 }} />
            )}
            <Collapse in={collapsed || openSections[sectionKey]} timeout={200}>
                <List dense disablePadding>
                    {items.map((item) => (
                        <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right" arrow>
                            <ListItemButton
                                selected={isActive(item.path)}
                                onClick={() => { navigate(item.path); onClose(); }}
                                sx={{
                                    pl: collapsed ? 'auto' : 2,
                                    py: 0.75,
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    mr: collapsed ? 0 : 1.5,
                                }}
                            >
                                <ListItemIcon sx={{
                                    minWidth: collapsed ? 0 : 36,
                                    color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                                    justifyContent: 'center',
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                {!collapsed && (
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{
                                            fontSize: '0.8125rem',
                                            fontWeight: isActive(item.path) ? 500 : 400,
                                        }}
                                    />
                                )}
                            </ListItemButton>
                        </Tooltip>
                    ))}
                </List>
            </Collapse>
        </Box>
    );

    const drawerContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Toolbar />
            {renderSection('Overview', mainNav, 'overview')}
            <Divider sx={{ my: 0.5 }} />
            {renderSection('Compute Engine', computeNav, 'compute')}
            <Divider sx={{ my: 0.5 }} />
            {renderSection('Networking', networkNav, 'networking')}
            <Divider sx={{ my: 0.5 }} />
            {renderSection('Operations', opsNav, 'operations')}
            <Divider sx={{ my: 0.5 }} />
            {renderSection('Billing', billingNav, 'billing')}
            {isAdmin && (
                <>
                    <Divider sx={{ my: 0.5 }} />
                    {renderSection('Administration', adminNav, 'admin')}
                </>
            )}

            {/* Collapse toggle at bottom */}
            <Box sx={{ mt: 'auto', pb: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
                <Tooltip title={collapsed ? 'Expand menu' : 'Collapse menu'} placement="right">
                    <IconButton onClick={onToggleCollapse} size="small" sx={{ color: 'text.secondary' }}>
                        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );

    return (
        <>
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onClose}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { width: drawerWidth },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Desktop drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        width: currentWidth,
                        transition: 'width 225ms cubic-bezier(0.4, 0, 0.6, 1)',
                        overflowX: 'hidden',
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </>
    );
}
