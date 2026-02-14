import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Box, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import PendingApproval from '../pages/PendingApproval';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, isPending, loading, token } = useAuth();

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

    // Show pending approval page for unapproved users
    if (isPending) {
        return <PendingApproval />;
    }

    // Only render children when we're sure the user is authenticated AND approved
    return <>{children}</>;
}
