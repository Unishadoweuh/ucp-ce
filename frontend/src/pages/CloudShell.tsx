import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
    CircularProgress,
    Chip,
    Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TerminalIcon from '@mui/icons-material/Terminal';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { fetchInstances, fetchLxcList } from '../api/client';
import api from '../api/client';

interface InstanceOption {
    vmid: number;
    name: string;
    node: string;
    type: string;
    status: string;
}

export default function CloudShell() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const termRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [instances, setInstances] = useState<InstanceOption[]>([]);
    const [selected, setSelected] = useState('');
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');

    // Load instances
    useEffect(() => {
        Promise.all([
            fetchInstances().catch(() => ({ data: [] })),
            fetchLxcList().catch(() => ({ data: [] })),
        ]).then(([vms, cts]) => {
            const vmList = (vms.data || []).map((v: any) => ({ vmid: v.vmid, name: v.name, node: v.node, type: 'qemu', status: v.status }));
            const ctList = (cts.data || []).map((c: any) => ({ vmid: c.vmid, name: c.name, node: c.node, type: 'lxc', status: c.status }));
            setInstances([...vmList, ...ctList]);
        });
    }, []);

    // Initialize terminal
    useEffect(() => {
        if (!termRef.current) return;

        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: '"Roboto Mono", "Cascadia Code", "Fira Code", monospace',
            theme: isDark ? {
                background: '#1a1b1e',
                foreground: '#e8eaed',
                cursor: '#8ab4f8',
                selectionBackground: 'rgba(138,180,248,0.3)',
                black: '#202124',
                red: '#ea4335',
                green: '#34a853',
                yellow: '#fbbc04',
                blue: '#8ab4f8',
                magenta: '#c58af9',
                cyan: '#78d9ec',
                white: '#e8eaed',
            } : {
                background: '#ffffff',
                foreground: '#202124',
                cursor: '#1a73e8',
                selectionBackground: 'rgba(26,115,232,0.2)',
                black: '#202124',
                red: '#ea4335',
                green: '#34a853',
                yellow: '#f9a825',
                blue: '#1a73e8',
                magenta: '#9334e6',
                cyan: '#12b5cb',
                white: '#f1f3f4',
            },
            scrollback: 5000,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(termRef.current);
        fitAddon.fit();

        terminal.writeln('\x1b[1;34m╔══════════════════════════════════════════╗\x1b[0m');
        terminal.writeln('\x1b[1;34m║\x1b[0m  \x1b[1;37mUCP Cloud Shell\x1b[0m                         \x1b[1;34m║\x1b[0m');
        terminal.writeln('\x1b[1;34m║\x1b[0m  Select an instance and click Connect    \x1b[1;34m║\x1b[0m');
        terminal.writeln('\x1b[1;34m╚══════════════════════════════════════════╝\x1b[0m');
        terminal.writeln('');

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            terminal.dispose();
        };
    }, [isDark]);

    const connect = async () => {
        if (!selected) return;
        const [type, node, vmidStr] = selected.split('|');
        const vmid = parseInt(vmidStr);
        const inst = instances.find(i => i.vmid === vmid && i.node === node);

        setConnecting(true);
        setError('');

        try {
            // Get VNC ticket from backend
            const res = await api.get(`/shell/ticket/${node}/${vmid}`, { params: { resource_type: type } });
            const { ticket, port } = res.data;

            // Connect WebSocket through our backend proxy
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const wsUrl = `${protocol}://${window.location.hostname}:8000/api/shell/ws/${node}/${vmid}?ticket=${encodeURIComponent(ticket)}&port=${port}&resource_type=${type}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.binaryType = 'arraybuffer';

            ws.onopen = () => {
                setConnected(true);
                setConnecting(false);
                const term = terminalRef.current;
                if (term) {
                    term.clear();
                    term.writeln(`\x1b[1;32mConnected to ${inst?.name || vmid} (${type.toUpperCase()})\x1b[0m`);
                    term.writeln('');
                }
            };

            ws.onmessage = (event) => {
                const term = terminalRef.current;
                if (!term) return;
                if (event.data instanceof ArrayBuffer) {
                    term.write(new Uint8Array(event.data));
                } else {
                    term.write(event.data);
                }
            };

            ws.onclose = () => {
                setConnected(false);
                setConnecting(false);
                terminalRef.current?.writeln('\r\n\x1b[1;33mSession disconnected.\x1b[0m');
            };

            ws.onerror = () => {
                setError('WebSocket connection failed');
                setConnected(false);
                setConnecting(false);
            };

            // Send terminal input to WebSocket
            terminalRef.current?.onData((data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });

        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to connect');
            setConnecting(false);
        }
    };

    const disconnect = () => {
        wsRef.current?.close();
        wsRef.current = null;
        setConnected(false);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TerminalIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h4">Cloud Shell</Typography>
                    {connected && (
                        <Chip label="CONNECTED" size="small" sx={{ bgcolor: 'rgba(52,168,83,0.12)', color: '#34a853', fontWeight: 700, fontSize: '0.65rem', ml: 1 }} />
                    )}
                </Box>
            </Box>

            {/* Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <FormControl sx={{ minWidth: 300 }} size="small">
                    <InputLabel>Instance</InputLabel>
                    <Select value={selected} label="Instance" onChange={e => setSelected(e.target.value)} disabled={connected}>
                        {instances.map(inst => (
                            <MenuItem key={`${inst.type}|${inst.node}|${inst.vmid}`} value={`${inst.type}|${inst.node}|${inst.vmid}`}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label={inst.type === 'qemu' ? 'VM' : 'LXC'}
                                        size="small"
                                        sx={{
                                            fontSize: '0.6rem', fontWeight: 700, height: 18,
                                            bgcolor: inst.type === 'qemu' ? 'rgba(26,115,232,0.12)' : 'rgba(156,39,176,0.12)',
                                            color: inst.type === 'qemu' ? '#1a73e8' : '#9c27b0',
                                        }}
                                    />
                                    {inst.name} ({inst.vmid})
                                    <Chip
                                        label={inst.status}
                                        size="small"
                                        sx={{
                                            fontSize: '0.55rem', fontWeight: 600, height: 16, ml: 'auto',
                                            bgcolor: inst.status === 'running' ? 'rgba(52,168,83,0.12)' : 'rgba(234,67,53,0.12)',
                                            color: inst.status === 'running' ? '#34a853' : '#ea4335',
                                        }}
                                    />
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {!connected ? (
                    <Button
                        variant="contained"
                        startIcon={connecting ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                        onClick={connect}
                        disabled={!selected || connecting}
                        sx={{ minWidth: 120 }}
                    >
                        {connecting ? 'Connecting...' : 'Connect'}
                    </Button>
                ) : (
                    <Button variant="outlined" color="error" startIcon={<StopIcon />} onClick={disconnect}>
                        Disconnect
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Terminal */}
            <Paper
                sx={{
                    flex: 1,
                    overflow: 'hidden',
                    borderRadius: 2,
                    border: `1px solid ${isDark ? '#3c4043' : '#dadce0'}`,
                    bgcolor: isDark ? '#1a1b1e' : '#ffffff',
                    p: 1,
                }}
            >
                <Box ref={termRef} sx={{ height: '100%', width: '100%' }} />
            </Paper>
        </Box>
    );
}
