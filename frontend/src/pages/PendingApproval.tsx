import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useAuth } from '../AuthContext';

export default function PendingApproval() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { user, logout } = useAuth();

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
                    maxWidth: 460,
                    width: '100%',
                    backgroundColor: isDark ? '#292a2d' : '#ffffff',
                }}
            >
                <HourglassEmptyIcon sx={{ fontSize: 56, color: '#fbbc04', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    En attente d'approbation
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                    Votre compte <strong>{user?.email}</strong> a été enregistré avec succès.
                    Un administrateur doit approuver votre accès avant que vous puissiez utiliser la plateforme.
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Vous serez automatiquement redirigé une fois votre compte validé.
                    Vous pouvez rafraîchir cette page pour vérifier.
                </Typography>
                <Typography
                    variant="body2"
                    onClick={logout}
                    sx={{ color: '#ea4335', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                >
                    Se déconnecter
                </Typography>
            </Paper>
        </Box>
    );
}
