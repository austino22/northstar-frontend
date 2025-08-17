// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

type User = { id: number; email: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on refresh (if token exists)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    // FastAPI OAuth2PasswordRequestForm expects form-encoded "username" + "password"
    const body = new URLSearchParams();
    body.set('username', email);
    body.set('password', password);

    const res = await api.post('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const token = res.data?.access_token as string;
    if (!token) throw new Error('No token returned');
    localStorage.setItem('token', token);

    const me = await api.get('/auth/me');
    setUser(me.data);
  };

  const register = async (email: string, password: string) => {
    await api.post('/auth/register', { email, password });
    // auto-login after register
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
