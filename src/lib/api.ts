import axios from 'axios';

function normalizeBase(raw?: string | null): string {
  const trimmed = (raw || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    // @ts-ignore
    new URL(trimmed);
    return trimmed;
  } catch {
    console.error('[API] Invalid VITE_API_BASE:', trimmed);
    return '';
  }
}

const envBase = normalizeBase(import.meta.env.VITE_API_BASE);

// Dev uses Vite proxy (see vite.config.ts); prod requires absolute URL
const baseURL = import.meta.env.PROD ? envBase : '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ns_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
