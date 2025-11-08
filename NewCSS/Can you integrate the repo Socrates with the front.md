<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Can you integrate the repo Socrates with the frontend of the iploaded project? I want all the functionality of the socrates repo just presented in the UI of this 0one. If you can create an implementation guide for an AI agent

Now I have comprehensive information about both the Socrates repository and the uploaded frontend project. Let me create a detailed implementation guide for integrating them.

## Integration Guide: Socrates Backend with Your Frontend UI

The [Socrates repository](https://github.com/Tanner-Eischen/Socrates) is a full-stack Socratic AI tutoring platform with a complete backend API and a React frontend, while your uploaded project appears to be a Next.js application with a polished UI design. This guide will help an AI agent integrate the Socrates backend functionality with your frontend's UI components.[^1][^2][^3]

### Architecture Overview

**Socrates Backend Stack:**

- Node.js + Express + TypeScript backend with RESTful API
- JWT authentication with refresh tokens
- Socket.IO for real-time features
- OpenAI API for Socratic dialogue engine
- Session management and analytics tracking
- WebSocket support for collaboration rooms

**Your Frontend Stack:**

- Next.js with TypeScript
- TailwindCSS for styling
- shadcn/ui components (Button, Input, Select, Card, Avatar, Badge, ScrollArea)
- Clean, modern UI design with dark mode support


### Integration Steps

#### Phase 1: Project Setup

**1.1 Create Unified Project Structure**

```
project-root/
├── backend/                    # Move Socrates src/ here
│   ├── src/
│   │   ├── api/
│   │   ├── core/
│   │   └── types.ts
│   ├── package.json
│   └── .env
├── frontend/                   # Your Next.js project
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/               # Your uploaded components
│   ├── package.json
│   └── next.config.js
└── README.md
```

**1.2 Install Backend Dependencies**

```bash
cd backend
npm install
```

Key dependencies from Socrates:

- `express`, `cors`, `helmet`, `compression`
- `socket.io` for real-time features
- `openai` for AI tutoring
- `jsonwebtoken`, `bcryptjs` for auth
- `winston` for logging

**1.3 Configure Environment Variables**
Create `backend/.env`:

```env
OPENAI_API_KEY=your_key_here
PORT=3000
NODE_ENV=development
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```


#### Phase 2: Backend API Integration

**2.1 Copy Core Socrates Files**
From the Socrates repository, copy these essential backend components:

- `src/socratic-engine.ts` - Core AI tutoring logic
- `src/session-manager.ts` - Session lifecycle management
- `src/types.ts` - TypeScript definitions
- `src/api/routes/` - All API endpoints
- `src/api/middleware/` - Auth and validation middleware

**2.2 Update API Server Configuration**
Create `backend/src/api/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json());

// Import routes from Socrates
import authRoutes from './routes/auth';
import problemRoutes from './routes/problems';
import sessionRoutes from './routes/sessions';
import analyticsRoutes from './routes/analytics';

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/problems', problemRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  // Import WebSocket handlers from Socrates
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```


#### Phase 3: Frontend Integration

**3.1 Create API Client**
Create `frontend/lib/api.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem('accessToken', data.accessToken);
          return api(originalRequest);
        } catch (err) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// API methods matching Socrates endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
};

export const sessionAPI = {
  createSession: (problemId: string, difficulty: string) =>
    api.post('/sessions', { problemId, difficulty }),
  getSession: (sessionId: string) => api.get(`/sessions/${sessionId}`),
  addInteraction: (sessionId: string, message: string) =>
    api.post(`/sessions/${sessionId}/interactions`, { message }),
  listSessions: () => api.get('/sessions'),
};

export const problemAPI = {
  listProblems: (filters?: any) => api.get('/problems', { params: filters }),
  getProblem: (problemId: string) => api.get(`/problems/${problemId}`),
};

export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getUserAnalytics: () => api.get('/analytics/user'),
};
```

**3.2 Create Socket.IO Hook**
Create `frontend/hooks/useSocket.ts`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, connected };
}
```

**3.3 Create Authentication Context**
Create `frontend/contexts/AuthContext.tsx`:

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/lib/api';

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
  register: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login(email, password);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  const register = async (registerData: any) => {
    const { data } = await authAPI.register(registerData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```


#### Phase 4: Update Your Page Component

**4.1 Modify Your Main Page**
Update `frontend/app/page.tsx` to integrate Socrates functionality:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { sessionAPI } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'tutor';
  content: string;
  timestamp: Date;
}

export default function SocraticTutorPage() {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subject, setSubject] = useState('mathematics');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [loading, setLoading] = useState(false);

  // Initialize session
  const startSession = async () => {
    try {
      setLoading(true);
      const { data } = await sessionAPI.createSession('custom', difficulty);
      setSessionId(data.sessionId);
      
      // Add welcome message
      setMessages([{
        id: '1',
        role: 'tutor',
        content: "I'm here to help you learn through the Socratic method. Instead of giving you direct answers, I'll guide you with thoughtful questions. What would you like to explore?",
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle message submission
  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await sessionAPI.addInteraction(sessionId, input);
      
      const tutorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'tutor',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, tutorMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO real-time updates
  useEffect(() => {
    if (socket && sessionId) {
      socket.emit('join-session', sessionId);

      socket.on('tutor-response', (data) => {
        const tutorMessage: Message = {
          id: Date.now().toString(),
          role: 'tutor',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, tutorMessage]);
      });

      return () => {
        socket.off('tutor-response');
      };
    }
  }, [socket, sessionId]);

  useEffect(() => {
    if (user && !sessionId) {
      startSession();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Your existing header/hero section */}
      
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          {/* Controls */}
          <div className="p-4 border-b flex gap-4">
            <Select value={subject} onValueChange={setSubject}>
              <option value="mathematics">Mathematics</option>
              <option value="science">Science</option>
              <option value="history">History</option>
            </Select>
            
            <Select value={difficulty} onValueChange={setDifficulty}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>

            <Badge variant={connected ? 'success' : 'secondary'}>
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {/* Messages */}
          <ScrollArea className="h-[500px] p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className="flex gap-3 max-w-[80%]">
                  {message.role === 'tutor' && (
                    <Avatar className="w-8 h-8">
                      <span>🎓</span>
                    </Avatar>
                  )}
                  
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="w-8 h-8">
                      <span>👤</span>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your question or response..."
              disabled={loading || !sessionId}
            />
            <Button onClick={handleSendMessage} disabled={loading || !sessionId}>
              Send
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
```

**4.2 Wrap Your App with Providers**
Update `frontend/app/layout.tsx`:

```typescript
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```


#### Phase 5: Additional Features

**5.1 Add Math Rendering (KaTeX)**
Install KaTeX:

```bash
cd frontend
npm install katex react-katex
```

Create `frontend/components/MathRenderer.tsx`:

```typescript
'use client';

import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export function MathRenderer({ content }: { content: string }) {
  // Parse LaTeX from content
  const parts = content.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);
  
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          return <BlockMath key={idx}>{part.slice(2, -2)}</BlockMath>;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={idx}>{part.slice(1, -1)}</InlineMath>;
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}
```

**5.2 Add Analytics Dashboard**
Create `frontend/app/analytics/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { analyticsAPI } from '@/lib/api';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data } = await analyticsAPI.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Your Learning Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Total Sessions</h3>
          <p className="text-4xl font-bold mt-2">{stats?.totalSessions || 0}</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Average Accuracy</h3>
          <p className="text-4xl font-bold mt-2">
            {stats?.averageAccuracy || 0}%
          </p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Learning Streak</h3>
          <p className="text-4xl font-bold mt-2">{stats?.streak || 0} days</p>
        </Card>
      </div>
    </div>
  );
}
```


#### Phase 6: Environment Configuration

**6.1 Frontend Environment Variables**
Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

**6.2 Update Next.js Config**
Create/update `frontend/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```


#### Phase 7: Testing \& Deployment

**7.1 Run Development Servers**
Terminal 1 (Backend):

```bash
cd backend
npm run api:dev
```

Terminal 2 (Frontend):

```bash
cd frontend
npm run dev
```

**7.2 Test Integration**

1. Navigate to `http://localhost:3000`
2. Register/login with test credentials
3. Start a learning session
4. Send messages and verify Socratic responses
5. Check analytics dashboard
6. Test real-time features with Socket.IO

### Key Integration Points

**API Endpoints to Connect:**

- `POST /api/v1/auth/register` → Registration form
- `POST /api/v1/auth/login` → Login form
- `POST /api/v1/sessions` → Start session button
- `POST /api/v1/sessions/:id/interactions` → Message submission
- `GET /api/v1/analytics/dashboard` → Analytics page
- `GET /api/v1/problems` → Problem browser

**WebSocket Events:**

- `join-session` → When user enters chat
- `tutor-response` → Real-time tutor messages
- `typing-indicator` → Show when tutor is responding
- `session-updated` → Sync session state


### Summary

This integration combines the powerful Socratic AI tutoring engine from the [Socrates repository](https://github.com/Tanner-Eischen/Socrates) with your polished Next.js frontend UI. The backend provides robust session management, JWT authentication, real-time collaboration via Socket.IO, and AI-powered Socratic dialogue through OpenAI's API, while your frontend delivers a clean, modern user experience with TailwindCSS and shadcn/ui components.[^2][^3][^1]

<div align="center">⁂</div>

[^1]: globals.css

[^2]: page.tsx

[^3]: layout.tsx

