import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import axios from 'axios';

interface User {
    id: number;
    google_id: string;
    email: string;
    name: string;
    picture: string | null;
    role: string;
    quota?: {
        id: number;
        user_id: number;
        max_vcpus: number;
        max_ram_gb: number;
        max_disk_gb: number;
        allowed_networks: string;
    } | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAdmin: boolean;
    isAuthenticated: boolean;
    loading: boolean;
    login: (googleCredential: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isAdmin: false,
    isAuthenticated: false,
    loading: true,
    login: async () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

// Get initial token from localStorage
const getInitialToken = (): string | null => {
    try {
        return localStorage.getItem('ucp-token');
    } catch {
        return null;
    }
};

// Configure axios interceptor immediately with the token
const configureAxiosAuth = (token: string | null) => {
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => {
        const initialToken = getInitialToken();
        // Configure axios IMMEDIATELY on mount if token exists
        configureAxiosAuth(initialToken);
        return initialToken;
    });
    const [loading, setLoading] = useState(true);

    // Update axios when token changes
    useEffect(() => {
        configureAxiosAuth(token);
    }, [token]);

    // Load user data from token on mount
    useEffect(() => {
        const loadUser = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get('/api/auth/me');
                setUser(res.data);
            } catch {
                // Token expired or invalid
                setToken(null);
                setUser(null);
                try { localStorage.removeItem('ucp-token'); } catch { }
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, [token]);

    const login = useCallback(async (googleCredential: string) => {
        const res = await axios.post('/api/auth/google', { credential: googleCredential });
        const { token: jwt, user: userData } = res.data;
        setToken(jwt);
        setUser(userData);
        try { localStorage.setItem('ucp-token', jwt); } catch { }
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        try { localStorage.removeItem('ucp-token'); } catch { }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAdmin: user?.role === 'admin',
                isAuthenticated: !!user,
                loading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
