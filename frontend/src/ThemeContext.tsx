import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, type PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import createAppTheme from './theme';

interface ThemeContextType {
    mode: PaletteMode;
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    toggleMode: () => { },
});

export const useThemeMode = () => useContext(ThemeContext);

function getStoredMode(): PaletteMode {
    try {
        const stored = localStorage.getItem('ucp-theme-mode');
        if (stored === 'dark' || stored === 'light') return stored;
    } catch { }
    // Default: check system preference
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<PaletteMode>(getStoredMode);

    const toggleMode = () => {
        setMode((prev) => {
            const next = prev === 'light' ? 'dark' : 'light';
            try {
                localStorage.setItem('ucp-theme-mode', next);
            } catch { }
            return next;
        });
    };

    const theme = useMemo(() => createAppTheme(mode), [mode]);

    return (
        <ThemeContext.Provider value={{ mode, toggleMode }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
}
