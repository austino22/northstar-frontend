import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await login(username, password); }
    catch (err: any) { setError(err?.response?.data?.detail ?? 'Login failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-sm mx-auto mt-24">
      <div className="glass p-6">
        <h1 className="text-lg font-semibold mb-4">Sign in</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="w-full border border-neutral-300 dark:border-neutral-700 rounded-xl p-2 bg-transparent" placeholder="Username" value={username} onChange={e=>setU(e.target.value)} />
          <input className="w-full border border-neutral-300 dark:border-neutral-700 rounded-xl p-2 bg-transparent" placeholder="Password" type="password" value={password} onChange={e=>setP(e.target.value)} />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button className="btn-primary w-full py-2 rounded-xl">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
