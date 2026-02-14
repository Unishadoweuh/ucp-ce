import { createTheme, type PaletteMode } from '@mui/material/styles';

// GCP-inspired color palette
const GOOGLE_BLUE = '#1a73e8';
const GOOGLE_BLUE_DARK = '#1557b0';
const GOOGLE_BLUE_LIGHT = '#8ab4f8';
const GOOGLE_GREEN = '#34a853';
const GOOGLE_GREEN_DARK = '#81c995';
const GOOGLE_RED = '#ea4335';
const GOOGLE_YELLOW = '#fbbc04';

export function createAppTheme(mode: PaletteMode) {
    const isDark = mode === 'dark';

    return createTheme({
        palette: {
            mode,
            primary: {
                main: isDark ? GOOGLE_BLUE_LIGHT : GOOGLE_BLUE,
                dark: isDark ? GOOGLE_BLUE : GOOGLE_BLUE_DARK,
                contrastText: isDark ? '#202124' : '#ffffff',
            },
            secondary: {
                main: isDark ? '#9aa0a6' : '#5f6368',
            },
            success: {
                main: isDark ? GOOGLE_GREEN_DARK : GOOGLE_GREEN,
            },
            error: {
                main: GOOGLE_RED,
            },
            warning: {
                main: GOOGLE_YELLOW,
            },
            background: {
                default: isDark ? '#202124' : '#f8f9fa',
                paper: isDark ? '#292a2d' : '#ffffff',
            },
            text: {
                primary: isDark ? '#e8eaed' : '#202124',
                secondary: isDark ? '#9aa0a6' : '#5f6368',
            },
            divider: isDark ? '#3c4043' : '#dadce0',
        },
        typography: {
            fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
            h4: {
                fontWeight: 400,
                fontSize: '1.375rem',
            },
            h5: {
                fontWeight: 500,
                fontSize: '1.125rem',
            },
            h6: {
                fontWeight: 500,
                fontSize: '1rem',
            },
            subtitle1: {
                fontWeight: 500,
                fontSize: '0.875rem',
            },
            body1: {
                fontSize: '0.875rem',
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            },
            body2: {
                fontSize: '0.8125rem',
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            },
            button: {
                fontWeight: 500,
                textTransform: 'none' as const,
                fontFamily: '"Google Sans", "Roboto", sans-serif',
            },
        },
        shape: {
            borderRadius: 4,
        },
        components: {
            MuiAppBar: {
                defaultProps: {
                    elevation: 0,
                },
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? '#292a2d' : '#ffffff',
                        borderBottom: `1px solid ${isDark ? '#3c4043' : '#dadce0'}`,
                        color: isDark ? '#e8eaed' : '#202124',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 4,
                        padding: '6px 24px',
                        fontSize: '0.875rem',
                    },
                    contained: {
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
                        },
                    },
                    outlined: {
                        borderColor: isDark ? '#5f6368' : '#dadce0',
                        color: isDark ? GOOGLE_BLUE_LIGHT : GOOGLE_BLUE,
                        '&:hover': {
                            backgroundColor: isDark ? 'rgba(138,180,248,0.08)' : 'rgba(26,115,232,0.04)',
                            borderColor: isDark ? '#8ab4f8' : '#dadce0',
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        height: 24,
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        borderRight: `1px solid ${isDark ? '#3c4043' : '#dadce0'}`,
                        backgroundColor: isDark ? '#292a2d' : '#ffffff',
                    },
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: '0 24px 24px 0',
                        marginRight: 12,
                        '&.Mui-selected': {
                            backgroundColor: isDark ? 'rgba(138,180,248,0.12)' : '#e8f0fe',
                            color: isDark ? GOOGLE_BLUE_LIGHT : GOOGLE_BLUE,
                            '& .MuiListItemIcon-root': {
                                color: isDark ? GOOGLE_BLUE_LIGHT : GOOGLE_BLUE,
                            },
                        },
                        '&:hover': {
                            backgroundColor: isDark ? 'rgba(232,234,237,0.08)' : '#f1f3f4',
                        },
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        border: `1px solid ${isDark ? '#3c4043' : '#dadce0'}`,
                        boxShadow: 'none',
                        backgroundColor: isDark ? '#292a2d' : '#ffffff',
                        '&:hover': {
                            boxShadow: isDark
                                ? '0 1px 2px 0 rgba(0,0,0,0.6), 0 1px 3px 1px rgba(0,0,0,0.3)'
                                : '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
                        },
                    },
                },
            },
            MuiTextField: {
                defaultProps: {
                    size: 'small',
                    variant: 'outlined',
                },
            },
            MuiSelect: {
                defaultProps: {
                    size: 'small',
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        borderBottomColor: isDark ? '#3c4043' : '#f1f3f4',
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        backgroundColor: isDark ? '#292a2d' : '#ffffff',
                    },
                },
            },
        },
    });
}

export default createAppTheme;
