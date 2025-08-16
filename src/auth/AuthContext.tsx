// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

// lightweight JWT decoder (no verification) to read the email from "sub"
function decodeEmailFromJWT(token: string | null): string | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json?.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

export type AuthUser = { email: string };

type AuthCtx = {
  token: string | null;
  user: AuthUser | null;        // <-- add user here
  isAuthed: boolean;
  login: (token: string, email?: string) => void; // allow passing email explicitly
  logout: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user_email');
    if (stored) return { email: stored };
    const email = decodeEmailFromJWT(localStorage.getItem('token'));
    return email ? { email } : null;
  });

  // keep state in sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') {
        const t = localStorage.getItem('token');
        setToken(t);
        const email = decodeEmailFromJWT(t);
        setUser(email ? { email } : null);
      }
      if (e.key === 'user_email') {
        const email = localStorage.getItem('user_email');
        setUser(email ? { email } : null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    token,
    user,
    isAuthed: !!token,
    login: (t: string, email?: string) => {
      localStorage.setItem('token', t);
      setToken(t);
      const finalEmail = email ?? decodeEmailFromJWT(t);
      if (finalEmail) {
        localStorage.setItem('user_email', finalEmail);
        setUser({ email: finalEmail });
      } else {
        localStorage.removeItem('user_email');
        setUser(null);
      }
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user_email');
      setToken(null);
      setUser(null);
    },
  }), [token, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
};
