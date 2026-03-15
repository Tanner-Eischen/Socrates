# Socrates

A Socratic tutoring application that asks guiding questions instead of giving answers.

---

## For Reviewers

**Try it:**
- **Live:** [socrates.up.railway.app](https://socrates.up.railway.app)
- **Demo login:** `demo@socrates.ai` / `password123`

**Run locally:**
```bash
# Terminal 1: Backend
cp .env.example .env && npm install && npm run api:dev

# Terminal 2: Frontend
cd client && npm install && npm run dev
# Open http://localhost:5173
```

**Key files to review:**

| What | Where |
|------|-------|
| Socratic dialogue logic | `src/socratic-engine.ts`, `src/engine/prompts.ts` |
| REST API | `src/api/routes/` (auth.ts, sessions.ts, analytics.ts) |
| React frontend | `client/src/pages/Session.tsx`, `client/src/components/` |
| WebSocket handlers | `src/api/websocket/handlers.ts` |
| CLI tool | `src/cli/` (chat.ts, run.ts, demo.ts) |

---

## How It Works

```
┌──────────────────┐     ┌──────────────────┐
│   React Client   │     │    CLI Tool      │
│  (Vite + TS)     │     │   (Node.js)      │
└────────┬─────────┘     └────────┬─────────┘
         │ HTTP/WS                │
         ▼                        ▼
┌─────────────────────────────────────────────┐
│           Express API Server                │
│  ┌─────────────────────────────────────┐   │
│  │  Socratic Engine (OpenAI-powered)   │   │
│  │  - Asks guiding questions           │   │
│  │  - Tracks conversation depth        │   │
│  │  - Adapts to student responses      │   │
│  └─────────────────────────────────────┘   │
│  Routes: auth, sessions, analytics, etc.   │
└─────────────────────────────────────────────┘
```

The tutor never gives direct answers. Instead, it:
1. **Clarifies** the student's understanding
2. **Probes assumptions** and evidence
3. **Explores implications** of their reasoning
4. **Guides discovery** through follow-up questions

---

## Features

**Backend (Express + TypeScript)**
- JWT authentication with refresh tokens
- Session tracking and interaction logging
- Analytics endpoints for learning metrics
- WebSocket support for real-time features

**Frontend (React + Vite)**
- Dashboard with session history
- Interactive Socratic chat with LaTeX rendering
- Analytics visualizations
- Real-time collaboration rooms

**CLI Tool**
- `tutor chat` — Interactive Socratic dialogue
- `tutor demo` — Scripted demo scenarios
- `tutor run` — One-shot tutoring session

---

## Project Structure

```
src/
├── socratic-engine.ts      # Core tutoring logic
├── engine/                 # Dialogue utilities
│   ├── prompts.ts          # Socratic prompt templates
│   ├── question-selector.ts
│   └── student-assessor.ts
├── session-manager.ts      # Session lifecycle
├── services/
│   └── adaptive-learning.ts
├── api/
│   ├── routes/             # REST endpoints
│   │   ├── auth.ts
│   │   ├── sessions.ts
│   │   └── analytics.ts
│   ├── websocket/          # Socket.IO handlers
│   └── middleware/         # Auth, logging, errors
└── cli/                    # Terminal interface
    ├── chat.ts
    ├── demo.ts
    └── run.ts

client/
└── src/
    ├── pages/              # Route components
    │   ├── Dashboard.tsx
    │   ├── Session.tsx
    │   └── Analytics.tsx
    └── components/         # UI components
        ├── MathRenderer.tsx
        └── ChatMessage.tsx
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (via pg) |
| Auth | JWT with refresh tokens |
| AI | OpenAI API |
| Realtime | Socket.IO |
| Frontend | React 19, Vite, TailwindCSS |
| Charts | Recharts |
| Math | KaTeX |

---

## Testing

```bash
# Backend unit tests
npm run test:unit

# Frontend tests
cd client && npm test

# Frontend coverage
cd client && npm run test:coverage
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/login` | Authenticate user |
| `POST /api/v1/auth/register` | Create account |
| `GET /api/v1/problems` | List problems |
| `POST /api/v1/sessions` | Start learning session |
| `POST /api/v1/sessions/:id/interactions` | Log chat interaction |
| `GET /api/v1/analytics/user` | User performance metrics |
| `GET /api/v1/analytics/dashboard` | Dashboard stats |

---

## License

MIT
