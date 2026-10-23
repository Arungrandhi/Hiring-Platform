import axios from 'axios';

let rawBase =
  import.meta.env.VITE_API_URL ||
  'https://hiring-platform-backend-9q9d.onrender.com/api';

rawBase = rawBase.trim().replace(/\/+$/, '');
if (!rawBase.endsWith('/api')) {
  rawBase += '/api';
}

const API_BASE_URL = rawBase;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: attach token from sessionStorage
axiosClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle 401 unauthorized & account status check
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear session on authentication failure
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      // Dispatch custom event so AuthContext can update state
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
