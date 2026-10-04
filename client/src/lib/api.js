import axios from 'axios';

export const TOKEN_KEY = 'tsa_token';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const data = err?.response?.data;
  if (data?.details && Array.isArray(data.details) && data.details[0]?.message) {
    const d = data.details[0];
    return `${d.path?.length ? `${d.path.join('.')}: ` : ''}${d.message}`;
  }
  return data?.error || err?.message || fallback;
}

export async function downloadCsv(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/uploads', fd);
  return data.url;
}
