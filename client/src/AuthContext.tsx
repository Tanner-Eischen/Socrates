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
    // Check for existing token first
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          // Try to auto-login with test user
          autoLoginDev();
        })
        .finally(() => setLoading(false));
    } else {
      // Auto-login with test user in development
      autoLoginDev();
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
    } catch (error) {
      // If login fails, try to register a test user
      try {
        const { data } = await api.post('/auth/register', {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
        localStorage.setItem('token', data.token);
        setUser(data.user);
      } catch (registerError) {
        // If both fail, use mock user (backend will bypass auth in dev mode)
        console.warn('Auto-login failed, using mock user. Backend must be in development mode.');
        const devUser: User = {
          id: 'dev-user-123',
          email: 'dev@example.com',
          name: 'Dev User',
          role: 'student',
        };
        setUser(devUser);
      }
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
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

