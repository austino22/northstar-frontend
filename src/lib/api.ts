import axios from 'axios'

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'https://<your-render-backend-url>'

export const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ns_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API ERROR]', {
      url: err.config?.url,
      method: err.config?.method,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    return Promise.reject(err);
  }
);
