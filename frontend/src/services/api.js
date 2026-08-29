// ============================================================================
// API Service — Centralized HTTP client
// ============================================================================
// This file wraps axios to:
// 1. Set a base URL so we don't repeat "http://localhost:5000" everywhere
// 2. Automatically attach the JWT token to every request
// 3. Handle auth errors globally (if token expires, redirect to login)
//
// 💡 WHY A CENTRALIZED API FILE?
// Instead of calling axios directly in every component, we create ONE 
// configured instance. This means:
// - If the backend URL changes, we change it in ONE place
// - Auth token handling is automatic, not copy-pasted everywhere
// - Error handling is consistent
// ============================================================================

import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request Interceptor — runs BEFORE every request is sent
// ============================================================================
// 💡 An interceptor is like Express middleware, but for the HTTP client.
// Before each request goes out, this function runs and attaches the JWT 
// token from localStorage to the Authorization header.
//
// The format "Bearer <token>" is a standard called "Bearer Authentication".
// The backend's auth middleware expects exactly this format.

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor — runs AFTER every response is received
// ============================================================================
// If we get a 401 (Unauthorized), it means the token expired or is invalid.
// We clear the stored token and redirect to login.

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
