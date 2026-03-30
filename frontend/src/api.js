import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : 'http://localhost:5001/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status !== 404) {
      // Don't toast 404s necessarily if they are handled by logic, 
      // but for everything else, show the error.
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
