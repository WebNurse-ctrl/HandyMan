import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('handyman_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('handyman_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// API helper functions
export const apiGet = <T>(url: string, params?: any) =>
  api.get<T>(url, { params }).then((res) => res.data);

export const apiPost = <T>(url: string, data?: any) =>
  api.post<T>(url, data).then((res) => res.data);

export const apiPatch = <T>(url: string, data?: any) =>
  api.patch<T>(url, data).then((res) => res.data);

export const apiDelete = <T>(url: string) =>
  api.delete<T>(url).then((res) => res.data);
