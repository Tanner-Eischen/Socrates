/**
 * Axios Configuration
 * Centralized HTTP client setup
 */

import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'https://socrates-1.onrender.com/api/v1',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - attach JWT token (skip for auth endpoints)
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Don't attach token for login/register endpoints
      const isAuthEndpoint = config.url?.includes('/auth/login') || 
                            config.url?.includes('/auth/register');
      
      if (!isAuthEndpoint) {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle common errors
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle 401 - redirect to login
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        // Don't redirect here - let components handle it
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

export const apiClient = createAxiosInstance();
export default apiClient;

