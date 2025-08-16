// src/lib/api.ts
import axios from 'axios';

const VITE_API_URL="https://NorthStar.onrender.com"


const API_BASE = import.meta.env.VITE_API_URL || VITE_API_URL;

export const api = axios.create({
  baseURL: API_BASE,
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
