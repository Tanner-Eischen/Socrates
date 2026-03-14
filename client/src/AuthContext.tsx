import { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const ENABLE_DEV_AUTO_LOGIN =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_AUTO_LOGIN === 'true';

interface ApiError {
  response?: {
    status?: number;
  };
  message?: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user explicitly logged out
    const hasLoggedOut = localStorage.getItem('hasLoggedOut') === 'true';
    
    // Don't auto-login if user explicitly logged out
    if (hasLoggedOut) {
      setLoading(false);
      return;
    }

    // Check for existing token first
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          // Try to auto-login with test user only in explicit dev mode.
          if (!hasLoggedOut && ENABLE_DEV_AUTO_LOGIN) {
            autoLoginDev();
          } else {
            setLoading(false);
          }
        });
    } else {
      // Auto-login with test user only in explicit dev mode.
      if (!hasLoggedOut && ENABLE_DEV_AUTO_LOGIN) {
        autoLoginDev();
      } else {
        setLoading(false);
      }
    }
  }, []);

  const autoLoginDev = async () => {
    if (!ENABLE_DEV_AUTO_LOGIN) {
      setLoading(false);
      return;
    }

    try {
      // Try to login with test credentials
      const { data } = await api.post('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setLoading(false);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      // If login fails (401), try to register a test user
      // This handles the case where user doesn't exist in production database
      if (apiError.response?.status === 401) {
        try {
          const { data } = await api.post('/auth/register', {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
          });
          localStorage.setItem('token', data.token);
          setUser(data.user);
          setLoading(false);
          return;
        } catch (registerError: unknown) {
          const registerApiError = registerError as ApiError;
          // If registration fails with 409 (user exists), try login again
          // This handles race conditions or password mismatch
          if (registerApiError.response?.status === 409) {
            console.warn('Test user already exists but login failed. Please register manually or check password.');
            // Don't auto-login, let user register manually
            setLoading(false);
            return;
          }
        }
      }
      
      // If all else fails, use mock user only in development
      if (import.meta.env.DEV) {
        console.warn('Auto-login failed, using mock user. Backend must be in development mode.');
        const devUser: User = {
          id: 'dev-user-123',
          email: 'dev@example.com',
          name: 'Dev User',
          role: 'student',
        };
        setUser(devUser);
      } else {
        // In production, don't auto-login - require manual registration
        console.info('Auto-login disabled in production. Please register or login manually.');
      }
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (!data || !data.token || !data.user) {
        throw new Error('Invalid response from server');
      }
      localStorage.setItem('token', data.token);
      localStorage.removeItem('hasLoggedOut'); // Clear logout flag on login
      setUser(data.user);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      // Re-throw the error so it can be handled by the calling component
      // but ensure it has a proper error structure
      if (apiError.response) {
        throw apiError;
      }
      // If it's not an axios error, wrap it
      throw new Error(apiError.message || 'Login failed. Please try again.');
    }
  };

  const logout = () => {
    localStorage.setItem('hasLoggedOut', 'true');
    localStorage.removeItem('token');
    setUser(null);
    // Navigation will be handled by the component calling logout
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

