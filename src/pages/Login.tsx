import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthed, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  // If already authed, bounce to home/dashboard
  useEffect(() => {
    if (isAuthed) navigate('/', { replace: true });
  }, [isAuthed, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = new URLSearchParams();
      body.set('username', email);
      body.set('password', password);

      const res = await api.post('/auth/login', body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const token = res.data?.access_token;
      if (!token) throw new Error('No token returned');

      // set app auth state and localStorage in one place
      login(token, email);

      // Prefer returning user to where they came from, else home
      const to = location.state?.from?.pathname && location.state.from.pathname !== '/login'
        ? location.state.from.pathname
        : '/';
      navigate(to, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Login failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded p-6">
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>

        {error && (
          <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          No account? <Link to="/register" className="text-blue-600">Create one</Link>
        </p>
      </div>
    </div>
  );
}
