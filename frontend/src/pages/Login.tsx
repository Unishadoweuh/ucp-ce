import { Box, Typography, Paper, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import CloudIcon from '@mui/icons-material/Cloud';
import { useState } from 'react';

export default function Login() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState('');

    const handleSuccess = async (response: CredentialResponse) => {
        if (!response.credential) {
            setError('No credential received from Google');
            return;
        }
        try {
            await login(response.credential);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#202124' : '#f8f9fa',
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 5,
                    borderRadius: 3,
                    border: `1px solid ${isDark ? '#3c4043' : '#dadce0'}`,
                    textAlign: 'center',
                    maxWidth: 400,
                    width: '100%',
                    backgroundColor: isDark ? '#292a2d' : '#ffffff',
                }}
            >
                {/* Logo */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
                    <CloudIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Typography
                        variant="h4"
                        sx={{ fontWeight: 500, fontSize: '1.75rem', color: 'text.primary' }}
                    >
                        UCP VM
                    </Typography>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                    Unified Cloud Platform — Proxmox Management
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                        {error}
                    </Alert>
                )}

                {/* Google Login Button */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={() => setError('Google Sign-In failed')}
                        theme={isDark ? 'filled_black' : 'outline'}
                        size="large"
                        width="300"
                        text="signin_with"
                        shape="rectangular"
                    />
                </Box>

                <Typography variant="body2" sx={{ mt: 4, color: 'text.secondary', fontSize: '0.75rem' }}>
                    Sign in with your Google account to manage your virtual machines.
                </Typography>
            </Paper>
        </Box>
    );
}
