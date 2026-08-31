// ============================================================================
// API Service — Centralized HTTP client
// ============================================================================
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor — attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Only attach if it's a real token (not demo token)
    if (token && !token.startsWith('demo-jwt-token')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor — handle 401s without disrupting demo mode
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = localStorage.getItem('token');
    
    // Only trigger auto-logout redirect if it's a real backend token that expired/failed
    if (
      error.response && 
      error.response.status === 401 && 
      token && 
      !token.startsWith('demo-jwt-token')
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
