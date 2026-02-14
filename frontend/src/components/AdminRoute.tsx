import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import type { ReactNode } from 'react';

export default function AdminRoute({ children }: { children: ReactNode }) {
    const { isAdmin } = useAuth();

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
