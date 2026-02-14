import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface StatusChipProps {
    status: string;
}

export default function StatusChip({ status }: StatusChipProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const configs: Record<string, { label: string; bg: string; color: string }> = {
        running: {
            label: 'Running',
            bg: isDark ? 'rgba(129,201,149,0.15)' : '#e6f4ea',
            color: isDark ? '#81c995' : '#137333',
        },
        stopped: {
            label: 'Stopped',
            bg: isDark ? 'rgba(154,160,166,0.15)' : '#f1f3f4',
            color: isDark ? '#9aa0a6' : '#5f6368',
        },
        paused: {
            label: 'Suspended',
            bg: isDark ? 'rgba(251,188,4,0.15)' : '#fef7e0',
            color: isDark ? '#fbbc04' : '#b05a00',
        },
        unknown: {
            label: 'Unknown',
            bg: isDark ? 'rgba(154,160,166,0.15)' : '#f1f3f4',
            color: isDark ? '#9aa0a6' : '#5f6368',
        },
    };

    const config = configs[status] || configs.unknown;

    return (
        <Chip
            label={config.label}
            size="small"
            sx={{
                fontWeight: 500,
                backgroundColor: config.bg,
                color: config.color,
                border: 'none',
            }}
        />
    );
}
