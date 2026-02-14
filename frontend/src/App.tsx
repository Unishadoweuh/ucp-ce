import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InstanceList from './pages/InstanceList';
import CreateInstance from './pages/CreateInstance';
import Snapshots from './pages/Snapshots';
import Backups from './pages/Backups';
import LxcList from './pages/LxcList';
import CreateLxc from './pages/CreateLxc';
import Monitoring from './pages/Monitoring';
import Logs from './pages/Logs';
import Networks from './pages/Networks';
import Activity from './pages/Activity';
import CloudShell from './pages/CloudShell';
import AdminUsers from './pages/admin/Users';
import AdminMachineTypes from './pages/admin/MachineTypes';
import AdminStorageConfig from './pages/admin/StorageConfig';

// Read Google Client ID from env (injected at build time or via runtime config)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="compute/instances" element={<InstanceList />} />
                            <Route path="compute/instances/create" element={<CreateInstance />} />
                            <Route path="compute/lxc" element={<LxcList />} />
                            <Route path="compute/lxc/create" element={<CreateLxc />} />
                            <Route path="compute/monitoring" element={<Monitoring />} />
                            <Route path="compute/logs" element={<Logs />} />
                            <Route path="compute/snapshots" element={<Snapshots />} />
                            <Route path="compute/backups" element={<Backups />} />
                            <Route path="networking/vpc" element={<Networks />} />
                            <Route path="operations/activity" element={<Activity />} />
                            <Route path="compute/shell" element={<CloudShell />} />
                            {/* Admin routes */}
                            <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                            <Route path="admin/machine-types" element={<AdminRoute><AdminMachineTypes /></AdminRoute>} />
                            <Route path="admin/storage" element={<AdminRoute><AdminStorageConfig /></AdminRoute>} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}

export default App;
