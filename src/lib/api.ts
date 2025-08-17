// frontend/src/lib/api.ts
import axios from 'axios';

function normalizeBase(raw?: string | null): string {
  const trimmed = (raw || '').trim().replace(/\/+$/, ''); // drop trailing slash
  if (!trimmed) return ''; // same-origin (only works if you proxy /api)
  try {
    // throws if invalid like "https://<your-render-backend-url>"
    // @ts-ignore
    new URL(trimmed);
    return trimmed;
  } catch {
    console.error('[API] Invalid VITE_API_BASE:', trimmed);
    return ''; // prevent "Invalid URL" crash; you’ll see 404 instead of a hard throw
  }
}

const envBase = normalizeBase(import.meta.env.VITE_API_BASE);

// If you’re NOT proxying in dev, force a sensible default:
const baseURL = import.meta.env.PROD 
? normalizeBase(import.meta.env.VITE_API_BASE)
: '/api';

export const api = axios.create({ baseURL });

// Attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ns_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
