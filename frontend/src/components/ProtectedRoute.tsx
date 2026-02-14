import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Box, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, loading, token } = useAuth();

    // Wait for auth to finish loading
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !token) {
        return <Navigate to="/login" replace />;
    }

    // Only render children when we're sure the user is authenticated AND token is set
    // This ensures axios has been configured with the Authorization header
    return <>{children}</>;
}
