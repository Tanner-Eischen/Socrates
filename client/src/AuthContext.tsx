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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

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
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          // Try to auto-login with test user only if not explicitly logged out
          if (!hasLoggedOut) {
            autoLoginDev();
          }
        })
        .finally(() => setLoading(false));
    } else {
      // Auto-login with test user in development only if not explicitly logged out
      if (!hasLoggedOut) {
        autoLoginDev();
      } else {
        setLoading(false);
      }
    }
  }, []);

  const autoLoginDev = async () => {
    try {
      // Try to login with test credentials
      const { data } = await api.post('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setLoading(false);
    } catch (error: any) {
      // If login fails (401), try to register a test user
      // This handles the case where user doesn't exist in production database
      if (error?.response?.status === 401) {
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
        } catch (registerError: any) {
          // If registration fails with 409 (user exists), try login again
          // This handles race conditions or password mismatch
          if (registerError?.response?.status === 409) {
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
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.removeItem('hasLoggedOut'); // Clear logout flag on login
    setUser(data.user);
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

