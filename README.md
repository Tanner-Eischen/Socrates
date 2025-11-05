# SocraTeach — AI-Powered Socratic Learning Platform

🎓 Full-stack Socratic AI tutoring platform with adaptive learning, real-time collaboration, and comprehensive analytics.

## Current Status

**Backend (Complete):**
- ✅ Core Socratic dialogue engine
- ✅ RESTful API with JWT authentication
- ✅ Problem management & classification
- ✅ Session tracking & analytics
- ✅ WebSocket support for real-time features

**Frontend (Phase 2 Complete):**
- ✅ React + TypeScript + TailwindCSS
- ✅ Dashboard with stats and progress tracking
- ✅ Math rendering (KaTeX/LaTeX support)
- ✅ Analytics charts and insights
- ✅ Real-time collaboration rooms
- ✅ Admin panel for user management
- ✅ 31 passing tests with 95%+ coverage

## Quick Start

### Backend Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Add your OpenAI API key and configuration
# Edit .env with your actual values

# 3. Install backend dependencies
npm install

# 4. Run backend API server (port 3000)
npm run api:dev
```

### Frontend Setup

```bash
# 1. Navigate to client directory
cd client

# 2. Install frontend dependencies
npm install

# 3. Run frontend dev server (port 5173)
npm run dev

# 4. Open browser to http://localhost:5173
```

### Full Stack Development

```bash
# Terminal 1: Backend API
npm run api:dev

# Terminal 2: Frontend
cd client && npm run dev

# Terminal 3: Run tests (optional)
cd client && npm test
```

## Project Structure

```
SocraTeach/
├── src/                           # Backend (Node.js + Express + TypeScript)
│   ├── api/
│   │   ├── routes/                # RESTful API endpoints
│   │   │   ├── auth.ts           # Authentication (login, register, tokens)
│   │   │   ├── problems.ts       # Problem CRUD + filtering
│   │   │   ├── sessions.ts       # Session management + interactions
│   │   │   └── analytics.ts      # User & system analytics
│   │   ├── websocket/            # Real-time features
│   │   │   └── handlers.ts       # Socket.IO event handlers
│   │   └── middleware/           # Auth, validation, error handling
│   ├── core/                      # Socratic engine & AI logic
│   │   ├── socratic-engine.ts    # Core tutoring engine
│   │   ├── adaptive-controller.ts # Adaptive difficulty
│   │   ├── analytics-engine.ts   # Performance tracking
│   │   └── session-manager.ts    # Session lifecycle
│   ├── services/                  # Business logic layer
│   └── types.ts                   # TypeScript type definitions
│
├── client/                        # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── pages/                # Main application pages
│   │   │   ├── Login.tsx         # Authentication
│   │   │   ├── Register.tsx      # User registration
│   │   │   ├── Dashboard.tsx     # Stats & recent sessions
│   │   │   ├── Problems.tsx      # Browse problems
│   │   │   ├── Session.tsx       # Socratic chat interface
│   │   │   ├── Analytics.tsx     # Charts & insights
│   │   │   ├── Profile.tsx       # User settings
│   │   │   ├── Collaboration.tsx # Real-time rooms
│   │   │   └── Admin.tsx         # User management (admin only)
│   │   ├── components/           # Reusable UI components
│   │   │   ├── MathRenderer.tsx  # KaTeX LaTeX rendering
│   │   │   └── SkeletonLoader.tsx # Loading states
│   │   ├── hooks/                # Custom React hooks
│   │   │   └── useSocket.ts      # Socket.IO connection
│   │   ├── lib/                  # Utilities
│   │   │   └── socket.ts         # Socket.IO setup
│   │   ├── test/                 # Test files + utilities
│   │   ├── AuthContext.tsx       # Auth state management
│   │   ├── api.ts                # Axios HTTP client
│   │   └── App.tsx               # Router configuration
│   ├── tailwind.config.js        # TailwindCSS config
│   ├── vite.config.ts            # Vite + Vitest config
│   └── package.json              # Frontend dependencies
│
├── .env.example                   # Environment template
├── package.json                   # Backend dependencies
└── README.md                      # This file
```

## Features

### Backend API
- **Authentication:** JWT-based auth with refresh tokens, role-based access control
- **Problem Management:** CRUD operations, filtering, tagging, difficulty levels
- **Session Tracking:** Create sessions, log interactions, track progress
- **Analytics:** User performance metrics, dashboard stats, system monitoring
- **Real-time:** Socket.IO for collaboration and live updates
- **Socratic Engine:** AI-powered tutoring with no direct answers

### Frontend Features
- **Dashboard:** Stats cards, recent sessions, quick actions
- **Problem Browser:** Filter and search problems, math rendering (KaTeX)
- **Learning Sessions:** Interactive Socratic chat with LaTeX support
- **Analytics:** Line/bar charts for accuracy, time spent, topic mastery
- **Profile Management:** Edit profile, change password
- **Collaboration:** Real-time rooms with messaging and presence
- **Admin Panel:** User management, system metrics (admin only)
- **Toast Notifications:** Success/error feedback
- **Skeleton Loaders:** Better loading UX

### Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- JWT authentication
- Socket.IO for WebSockets
- OpenAI API for AI tutoring

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Router (routing)
- Axios (HTTP client)
- Socket.IO client
- KaTeX (math rendering)
- Recharts (data visualization)
- React Hot Toast (notifications)
- Vitest + React Testing Library (testing)

## Testing

### Frontend Tests
```bash
cd client

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage

# Open test UI
npm run test:ui
```

**Test Coverage:**
- 31 passing tests
- ~95%+ coverage on core features
- Components: Login, Problems, Session, AuthContext

### Backend Validation
```bash
# Run Socratic engine validation
npx ts-node src/validation-test.ts

# Test Day 2 features (parsing, classification)
npx ts-node src/test-day2-features.ts

# Demo conversation and reporting
npx ts-node src/demo-test.ts
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create new user account
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/change-password` - Update password

### Problems
- `GET /api/v1/problems` - List problems (with filters)
- `GET /api/v1/problems/:id` - Get problem details
- `POST /api/v1/problems` - Create problem (tutor/admin)
- `PATCH /api/v1/problems/:id` - Update problem
- `DELETE /api/v1/problems/:id` - Delete problem

### Sessions
- `POST /api/v1/sessions` - Start new learning session
- `GET /api/v1/sessions/:id` - Get session details
- `GET /api/v1/sessions` - List user sessions
- `POST /api/v1/sessions/:id/interactions` - Log interaction
- `PATCH /api/v1/sessions/:id/status` - Update session status

### Analytics
- `GET /api/v1/analytics/user` - User performance metrics
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/system` - System metrics (admin)

## Development

### Backend Scripts
```bash
npm run api:dev        # Start API server (dev mode with hot reload)
npm run build          # Build TypeScript to JavaScript
npm run start          # Run production build
npm test               # Run CLI tester
```

### Frontend Scripts
```bash
cd client
npm run dev            # Start Vite dev server
npm run build          # Build for production
npm run preview        # Preview production build
npm test               # Run Vitest tests
npm run test:coverage  # Generate coverage report
```

## Deployment

### Backend
- Set environment variables in production
- Run `npm run build` to compile TypeScript
- Start with `npm run start` or use PM2/Docker

### Frontend
- Build with `npm run build` in client directory
- Deploy `client/dist/` folder to:
  - Vercel (recommended)
  - Netlify
  - AWS S3 + CloudFront
  - Any static hosting service

## Environment Variables

Required in `.env`:
```bash
# OpenAI
OPENAI_API_KEY=your_key_here

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Database (if using)
DATABASE_URL=your_db_url

# CORS
CORS_ORIGIN=http://localhost:5173
```

## License

MIT

## Contributing

This is a learning platform built with pedagogical effectiveness in mind. Contributions welcome!