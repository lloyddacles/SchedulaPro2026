import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // Enable sending cookies with requests
});

// Request interceptor removed as cookies are handled automatically by the browser

api.interceptors.response.use(
  response => response,
  error => {
    let message = 'An unexpected error occurred';
    if (error.response?.data?.error?.message) {
        message = error.response.data.error.message;
    } else if (typeof error.response?.data?.error === 'string') {
        message = error.response.data.error;
    } else if (error.response?.data?.message) {
        message = error.response.data.message;
    } else if (error.message) {
        message = error.message;
    }
    
    const code = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    const isLoginPath = window.location.pathname === '/login';

    if (error.response?.status === 401 || error.response?.status === 403) {
      // Only toast if we aren't already on the login page to avoid "toast storms"
      if (!isLoginPath) {
        toast.error('Session expired or invalid. Please login again.');
        window.location.href = '/login';
      }
      localStorage.removeItem('token');
    } else if (error.response?.status !== 404 && !isLoginPath) {
      // Don't toast 404s or generic errors if we are on login page
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
