# Socrates — AI-Powered Socratic Learning Platform

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

### CLI (Tutor) — Live Socratic Chat (Text + Image)

```bash
# 1) Ensure your OpenAI key is set (project-level .env or shell env)
echo OPENAI_API_KEY=your-openai-api-key-here > .env

# 2) Install dependencies
npm install

# 3A) Use the CLI locally without global link
node ./bin/socrates --help

# 3B) Or create a global alias (makes `tutor` available)
npm link
tutor --help
```

Common commands:

```bash
# Interactive chat (text)
tutor chat --problem "Solve 2x + 5 = 13" --difficulty beginner

# Interactive chat (image)
tutor chat --image ./samples/linear1.png

# One-shot run (first tutor response + compliance)
tutor run --problem-id 0

# Scripted demo (live tutor responses)
tutor demo --scenario algebra-beginner

# Problem bank utilities
tutor problems list
tutor problems show 0
```

In-chat commands during `tutor chat`:

```text
:attach <imagePath>            # Attach an image; extracts text and adds as context
:difficulty <level>            # Switch difficulty: beginner|intermediate|advanced
:quit                          # Exit the session
```

Notes:
- The CLI uses live OpenAI calls (no mocks), so responses vary run-to-run.
- `OPENAI_API_KEY` must be available in `.env` or the environment.
- Windows PowerShell works out-of-the-box; no TTY tricks required.

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
Socrates/
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
# CLI one-shot sanity test
tutor run --problem "Solve 2x + 5 = 13"

# Interactive chat
tutor chat --problem "Explain the slope of y = 2x + 1" --difficulty intermediate

# Scripted demos (live)
tutor demo --scenario algebra-beginner
tutor demo --scenario geometry-intermediate
tutor demo --scenario calculus-advanced
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
- `GET /api/v1/sessions/:id/journey` - Get learning journey timeline for a session
- `GET /api/v1/sessions/:id/compliance` - Get Socratic compliance metrics for a session
- `GET /api/v1/analytics/session/:id/report` - Get aggregated learning metrics report for a session

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

# Behavioral Learning Measurement (Optional)
UNDERSTANDING_CHECK_INTERVAL=3          # Interval between understanding checks (default: 3)
ENABLE_TRANSFER_PROBES=true             # Enable transfer challenge probes (default: true)
ENABLE_TEACHBACK_PROBES=true            # Enable teach-back probes (default: true)
STRICT_SOCRATIC_MODE=false              # Enable strict Socratic compliance mode (default: false)
```

## CLI Measurement & Analytics

The CLI showcases the Socratic method and provides simple, interpretable measurements:

- **Socratic compliance**: Detects direct answers via `containsDirectAnswer(response)`.
  - Shown in `tutor run` and summarized in `tutor demo` as “Direct answers detected” and PASS/FAIL.
- **Question type distribution**: Which Socratic question types were used (clarification, assumptions, evidence, perspective, implications, meta_questioning).
- **Depth metrics**: Current and maximum depth reached in the inquiry (1–5 scale).
- **Concepts explored**: Topics inferred from the conversation (algebra, geometry, calculus, etc.).
- **Confidence progression**: Sequence of inferred student confidence values across turns.
- **Engagement score**: Heuristic combining depth and response dynamics.

Example `tutor demo` summary:

```text
=== Demo Summary ===
Direct answers detected: 0
Socratic compliance: PASSED
Question types: clarification, assumptions, evidence, perspective
Average depth: 3
Concepts explored: algebra
Total interactions: 10
```

Tips to improve compliance if failures occur:
- Re-run (live model variability). 
- Adjust problem phrasing to avoid prompting direct numeric solutions.
- Lower difficulty (`:difficulty beginner`) to increase scaffolding when the student struggles.

## CLI Scenarios & Images

Scripted demo files live in `fixtures/scripts/`:
- `algebra-beginner.json`
- `geometry-intermediate.json`
- `calculus-advanced.json`

You can create your own by following the same JSON shape:

```json
{
  "name": "my-scenario",
  "problem": "Explain why the sum of two even numbers is even.",
  "difficulty": "intermediate",
  "turns": [
    "I'm not sure where to start.",
    "Even numbers are multiples of 2, right?"
  ]
}
```

Image intake is supported in `tutor chat` using `--image` at start or `:attach <path>` mid-session. The CLI will extract text with the available image/text processors and inject it as context for the next Socratic turn.

## License

MIT

## Contributing

This is a learning platform built with pedagogical effectiveness in mind. Contributions welcome!