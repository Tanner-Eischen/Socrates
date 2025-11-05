The UI we’ll build: simple, fast, and beautiful
===============================================

**Design language (tasteful-minimal)**

* **Typography**: Inter (UI), and JetBrains Mono for code/math blocks.

* **Palette**:
  
  * Background: `#0B0F14` (slate-near-black)
  
  * Surface: `#11151B` / `#141A22` (cards, navbar)
  
  * Primary: `#6EE7F5` (teal-cyan)
  
  * Accent: `#A78BFA` (lavender)
  
  * Text: `#E5E7EB` (primary), `#94A3B8` (muted)
  
  * Success/Warning/Error: `#34D399` / `#F59E0B` / `#F87171`

* **Style**: large radii (`rounded-2xl`), soft shadows, subtle glass on top surfaces, **focus rings** for a11y, sensible spacing (8px grid).

* **Components**: shadcn/ui + Tailwind for speed and consistency (cards, inputs, dialog, dropdowns, toasts, skeletons).

**Tech choices**

* **React + Vite + TypeScript**

* **TailwindCSS** + **shadcn/ui** + **lucide-react** (icons)

* **React Router** for client routing

* **TanStack Query** for API data + caching + retries

* **Zustand** for lightweight UI/ephemeral state (theme, drawers, modals)

* **Socket.IO client** for collab rooms

* **Zod** for client-side validation & response parsing

* **MSW** (optional) for local mocks during UI dev without running the backend

* **Playwright** + **Vitest** for tests

* * *

Project Structure (Monorepo)
=============================

```
SocraTeach/                         # ROOT
├── src/                            # ✅ BACKEND (existing)
│   ├── api/                       # Express REST API
│   ├── socratic-engine.ts
│   └── [other core modules]
│
├── client/                         # 🆕 FRONTEND (new)
│   ├── public/
│   │   └── fonts/                 # Inter, JetBrains Mono
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts          # Axios instance
│   │   │   ├── auth.ts
│   │   │   ├── problems.ts
│   │   │   ├── sessions.ts
│   │   │   ├── analytics.ts
│   │   │   └── types.ts           # Zod schemas
│   │   ├── components/
│   │   │   ├── ui/                # shadcn components
│   │   │   ├── layout/            # AppShell, Navbar, Sidebar
│   │   │   ├── problems/          # ProblemCard, List, Filters
│   │   │   ├── session/           # ChatPane, EvidencePane, Composer
│   │   │   ├── collaboration/     # RoomHeader, ParticipantsList
│   │   │   └── shared/            # LoadingSpinner, ErrorBoundary
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useProblems.ts     # TanStack Query
│   │   │   ├── useSessions.ts
│   │   │   ├── useSocket.ts
│   │   │   └── useAnalytics.ts
│   │   ├── pages/
│   │   │   ├── Auth.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Problems.tsx
│   │   │   ├── SessionPage.tsx
│   │   │   ├── Collaboration.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Profile.tsx
│   │   │   └── Admin.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts       # Zustand
│   │   │   ├── uiStore.ts
│   │   │   └── sessionStore.ts
│   │   ├── lib/
│   │   │   ├── utils.ts           # cn() helper
│   │   │   ├── socket.ts          # Socket.IO
│   │   │   └── validators.ts      # Zod schemas
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.tsx                # Router
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   ├── package.json               # Frontend deps
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── playwright.config.ts
│
├── dist/                           # Backend build
├── uploads/                        # File uploads
├── logs/                           # Backend logs
├── package.json                    # Backend deps
├── tsconfig.json                   # Backend TS config
└── plan.md                         # This file
```

* * *

Information Architecture & Screens
==================================

1. **Auth**
   
   * Login / Register (single panel toggle)
   
   * Forgot / Reset (if you want to wire later)

2. **Dashboard**
   
   * Quick actions: “Start Study Session”, “Browse Problems”, “Resume Last Session”
   
   * Recent sessions, progress streak, micro-analytics

3. **Problems**
   
   * List / Filters (Subject, Difficulty, Type)
   
   * Problem details (statement, media, tags)
   
   * “Start with Socratic Mode” CTA

4. **Study Session (Socratic)**
   
   * Left: **Conversation** (chat turns, math blocks, image snippets)
   
   * Right: **Evidence & Notes** (auto-log, hints, steps, confidence)
   
   * Bottom: **Answer composer** + controls (check, hint, reveal step)

5. **Planner**
   
   * Auto-generated plans from session history (mini-kanban or checklist)

6. **Collaboration**
   
   * Join/Host a live room; participant list; presence; shared notes

7. **Analytics (basic)**
   
   * Accuracy over time, time-on-task, topic mastery heatmap (start simple)

8. **Profile**
   
   * Name, email, role, 2FA toggle stub, preferences (theme)

9. **Admin (role-gated)**
   
   * Users, sessions overview, system health (surface monitoring read-only)

* * *


=========================

**Auth API** (`/api/v1/auth/`)

```typescript
// POST /api/v1/auth/register
interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role?: 'student' | 'tutor'; // defaults to student
}
// Response: { message, user, token, refreshToken, expiresIn }

// POST /api/v1/auth/login
interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}
// Response: { message, user, token, refreshToken, expiresIn }

// POST /api/v1/auth/refresh
interface RefreshPayload {
  refreshToken: string;
}
// Response: { message, token, refreshToken, expiresIn }

// GET /api/v1/auth/me
// Response: { user: { id, email, name, role, createdAt, lastLogin } }

// POST /api/v1/auth/logout
// Response: { message }

// POST /api/v1/auth/change-password
// Payload: { currentPassword, newPassword }
```

**Problems API** (`/api/v1/problems/`)

```typescript
// GET /api/v1/problems?type=math&difficulty=3&category=&tags=&search=&limit=20&offset=0
// Response: { 
//   success: true,
//   data: Problem[],
//   pagination: { limit, offset, total, hasMore }
// }

interface Problem {
  id: string;
  title: string;
  description: string;
  type: 'math' | 'science' | 'programming' | 'logic' | 'language' | 'other';
  difficultyLevel: number; // 1-10
  tags: string[];
  category: string;
  estimatedTime: number; // minutes
  hints: string[];
  solution?: string; // only for admin/tutor
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

// GET /api/v1/problems/:id
// Response: { success: true, data: Problem }

// POST /api/v1/problems (admin/tutor only)
// Payload: Omit<Problem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isActive'>

// PATCH /api/v1/problems/:id (admin/tutor only)
// Payload: Partial<Problem>

// DELETE /api/v1/problems/:id (admin only - soft delete)

// GET /api/v1/problems/categories
// Response: { success: true, data: string[] }

// GET /api/v1/problems/tags
// Response: { success: true, data: string[] }
```

**Sessions API** (`/api/v1/sessions/`)

```typescript
// POST /api/v1/sessions
interface CreateSessionPayload {
  problemId?: string;
  problemText: string;
  problemType: 'math' | 'science' | 'programming' | 'logic' | 'language' | 'other';
  difficultyLevel?: number; // 1-10, default 1
}
// Response: { success: true, data: Session }

interface Session {
  id: string;
  userId: string;
  problemId?: string;
  problemText: string;
  problemType: string;
  difficultyLevel: number;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  interactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/v1/sessions?limit=20&offset=0&status=active
// Response: { success: true, data: Session[], pagination }

// GET /api/v1/sessions/:id
// Response: { success: true, data: Session }

// PATCH /api/v1/sessions/:id
// Payload: { status: 'active' | 'completed' | 'paused' | 'abandoned', endTime?: Date }

// POST /api/v1/sessions/:id/interactions
interface AddInteractionPayload {
  type: 'question' | 'answer' | 'hint' | 'feedback' | 'voice' | 'image';
  content: string;
  metadata?: any;
  processingTime?: number;
  confidenceScore?: number; // 0-1
}
// Response: { success: true, data: Interaction }

// GET /api/v1/sessions/:id/interactions?limit=50&offset=0
// Response: { success: true, data: Interaction[], pagination }

// DELETE /api/v1/sessions/:id

// GET /api/v1/sessions/stats
// Response: session statistics for current user
```

**Analytics API** (`/api/v1/analytics/`)

```typescript
// GET /api/v1/analytics/user?timeframe=day&startDate=&endDate=
// Response: { success: true, data: UserAnalytics }

// GET /api/v1/analytics/dashboard
// Response: role-specific dashboard data (student, tutor, or admin)

// GET /api/v1/analytics/insights?timeframe=month
// Response: { success: true, data: LearningInsights }

// GET /api/v1/analytics/behavior?userId=&timeframe=month (admin/tutor only)
// Response: { success: true, data: BehaviorPatterns }

// POST /api/v1/analytics/track
// Payload: { eventType: string, eventData?: any, sessionId?: string }

// GET /api/v1/analytics/events (admin/tutor only)
// Query: timeframe, startDate, endDate, eventType, userId, sessionId, limit, offset

// GET /api/v1/analytics/system (admin only)
// Query: timeframe, startDate, endDate

// GET /api/v1/analytics/export?format=json&timeframe=month (admin only)
```

**Collaboration (Socket.IO)**

`// socket.ts import { io } from "socket.io-client"; export const socket = io(import.meta.env.VITE_API_BASE_URL!.replace("/api/v1",""), {  autoConnect: false,  transports: ["websocket"]});`

* * *

Component blueprints
====================

### AppShell

* **Top Navbar**: logo (wordmark), quick actions, user menu

* **Sidebar**: icons + labels (Dashboard, Problems, Sessions, Planner, Collab, Analytics, Profile)

* **Content**: scrollable area with max-width container

### Problems

* **Filters**: subject (math/science/etc), difficulty (easy/med/hard), type (MCQ, free response), text query

* **Cards**: title, tags, quick stats, “Start Socratic Session”

* **Detail**: markdown/LaTeX rendering; “Open in Session”

### Session

* **ChatPane** (left): messages, roles, math rendering, attachments

* **EvidencePane** (right): steps, hints, extracted formulas, confidence meter

* **Composer** (bottom): textarea + actions (Hint, Check, Next Step)

### Collaboration

* **Room header**: host controls, room code

* **Participants list**: avatar + status

* **Shared notes**: rich text w/ presence cursors (basic version can be a shared text box updated via socket events)

### Analytics (starter)

* **Tiles**: Accuracy %, Avg session length, #sessions

* **Chart**: line over time (TanStack Charts or Recharts)

* **Heatmap** (later)

* * *

Progressive PR plan (shippable slices)
======================================

**PR 1 — Project scaffolding (UI)**

* Vite + React + TS; Tailwind; shadcn; lucide

* Global styles & theme tokens; AppShell with Navbar + Sidebar

* **Tests**: build runs; snapshot for AppShell

**PR 2 — Auth**

* Login/Register pages; Zod validation

* `api.ts` with interceptors; `useAuth` hook; `ProtectedRoute`

* **Tests**: auth happy path; 401 → refresh → retry; route guard

**PR 3 — Problems**

* Problems list w/ filters; detail page

* TanStack Query for data fetching + skeletons; empty states

* **Tests**: list renders; filter calls; detail load

**PR 4 — Study Session (Socratic)**

* Session page layout: ChatPane, EvidencePane, Composer

* Start session from problem & from dashboard

* **Tests**: session create; message render; composer actions (stub)

**PR 5 — Collaboration (real-time)**

* Socket client wiring; join/leave room

* Participant presence; shared notes (basic)

* **Tests**: socket connects; presence list; CRDT later

**PR 6 — Analytics (MVP)**

* Tiles + one line chart using `/analytics` endpoints

* **Tests**: renders with mock data; error boundary

**PR 7 — Profile & Preferences**

* Basic profile form; theme toggle; 2FA stub UI

* **Tests**: PATCH profile; form validation

**PR 8 — Polish & a11y**

* Keyboard nav, focus rings, skip links, reduced motion

* Toasts, error states, loading skeletons everywhere

* **Tests**: a11y checks (axe), happy-path flows E2E (Playwright)

* * *

“Beautiful by default” UI details to copy-paste
===============================================

**Tailwind layout scaffolding**

`// AppShell.tsx export default function AppShell({ children }: { children: React.ReactNode }) {  return (    <div className="min-h-dvh bg-[#0B0F14] text-slate-200">      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur">        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">          <div className="flex items-center gap-3">            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-300 to-violet-400" />            <span className="font-semibold tracking-wide">SocraTeach</span>          </div>          <nav className="flex items-center gap-2">            {/* user menu / quick actions */}          </nav>        </div>      </header>      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">        <aside className="col-span-12 md:col-span-3 lg:col-span-2">          <div className="rounded-2xl border border-white/5 bg-[#11151B] p-2">            {/* nav items */}          </div>        </aside>        <main className="col-span-12 md:col-span-9 lg:col-span-10">          {children}        </main>      </div>    </div>  );}`

**Problem card**

`function ProblemCard({ title, tags, description, onStart }: {  title: string; tags: string[]; description: string; onStart: () => void;}) {  return (    <div className="rounded-2xl border border-white/5 bg-[#11151B] p-5 hover:border-cyan-400/30 transition">      <h3 className="text-lg font-semibold">{title}</h3>      <p className="mt-2 line-clamp-3 text-slate-400">{description}</p>      <div className="mt-3 flex flex-wrap gap-2">        {tags.map(t => (          <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">            {t}          </span>        ))}      </div>      <div className="mt-4">        <button onClick={onStart} className="rounded-xl px-4 py-2 bg-cyan-300/10 border border-cyan-300/30 hover:bg-cyan-300/20">          Start Socratic Session        </button>      </div>    </div>  );}`

**Session layout**

`export default function SessionPage() {  return (    <div className="grid grid-cols-12 gap-4">      <section className="col-span-12 lg:col-span-7 rounded-2xl border border-white/5 bg-[#11151B] p-4">        {/* ChatPane */}      </section>      <aside className="col-span-12 lg:col-span-5 rounded-2xl border border-white/5 bg-[#11151B] p-4">        {/* EvidencePane */}      </aside>      <footer className="col-span-12">        <div className="rounded-2xl border border-white/5 bg-[#11151B] p-3">          {/* Composer */}        </div>      </footer>    </div>  );}`

* * *

Env for the UI
==============

Create `.env` in `/client`:

`VITE_API_BASE_URL=http://localhost:3000/api/v1`

(Adjust to your server address. If you rely on refresh **cookies**, set `withCredentials: true` in the client and configure CORS on the server to allow credentials and your UI origin.)

* * *

Testing (targeted)
==================

* **Unit**: `api.ts` interceptor behavior (401 → refresh → retry), simple component rendering.

* **Integration**: problems list fetch + filters; session create & display.

* **E2E (Playwright)**: login → dashboard → open problem → start session → see panes.

* * *

Nice-to-haves next
==================

* Math input (Katex/Mathlive) in the composer.

* File/image upload to attach problem figures (your backend has `/uploads` dir and media examples—wire when ready).

* Offline mode (cache last session).

* Role-gated Admin page that lightly surfaces `/monitoring`, `/analytics` system stats read-only.

* * *

State Management Strategy
==========================

## Zustand Stores (Client-side ephemeral state)

### authStore.ts
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  setToken: (token: string) => void;
}
```

### uiStore.ts
```typescript
interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  activeModal: string | null;
  toast: { message: string; type: 'success' | 'error' | 'info'; visible: boolean } | null;
  toggleSidebar: () => void;
  showToast: (toast: { message: string; type: string }) => void;
  hideToast: () => void;
}
```

### sessionStore.ts (Optimistic updates during study)
```typescript
interface SessionState {
  activeSession: Session | null;
  messages: Message[];
  evidenceLog: Evidence[];
  setActiveSession: (session: Session) => void;
  addMessage: (message: Message) => void;
  updateConfidence: (score: number) => void;
  clearSession: () => void;
}
```

## TanStack Query (Server state)

- **Query keys**: 
  - `['problems', filters]`
  - `['problem', id]`
  - `['sessions']`
  - `['session', id]`
  - `['analytics', 'dashboard']`
  - `['analytics', 'user', timeframe]`

- **Configuration**:
  - Stale time: 5 minutes for problems, 30 seconds for session data
  - Cache time: 10 minutes
  - Retry: 3 attempts with exponential backoff
  - Refetch on window focus: enabled for dashboard
  - Optimistic updates for session interactions

## Socket.IO (Real-time sync)

- Connection state managed in `useSocket` hook
- Events: `room:join`, `room:leave`, `presence:update`, `note:edit`, `message:new`
- Reconnection logic with exponential backoff
- Merge socket events into TanStack Query cache

* * *

API Client Setup (Detailed)
============================

## client.ts — Axios instance with JWT interceptors

```typescript
// client/src/api/client.ts
import axios from 'axios';
import { authStore } from '@/store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT access token
api.interceptors.request.use(
  (config) => {
    const token = authStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 & auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 and haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = authStore.getState().refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        // Call backend refresh endpoint
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        // Update tokens in store
        authStore.getState().setToken(data.token);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed → logout
        authStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## auth.ts — Auth API with Zod validation

```typescript
// client/src/api/auth.ts
import { api } from './client';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['student', 'tutor', 'admin']),
  createdAt: z.string(),
  lastLogin: z.string().nullable(),
});

const LoginResponseSchema = z.object({
  message: z.string(),
  user: UserSchema,
  token: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return LoginResponseSchema.parse(data);
}

export async function register(payload: {
  email: string;
  password: string;
  name: string;
  role?: 'student' | 'tutor';
}) {
  const { data } = await api.post('/auth/register', payload);
  return LoginResponseSchema.parse(data);
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return z.object({ user: UserSchema }).parse(data);
}

export async function logout() {
  const { data } = await api.post('/auth/logout');
  return data;
}
```

## problems.ts — Problems API

```typescript
// client/src/api/problems.ts
import { api } from './client';
import { z } from 'zod';

const ProblemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['math', 'science', 'programming', 'logic', 'language', 'other']),
  difficultyLevel: z.number().int().min(1).max(10),
  tags: z.array(z.string()),
  category: z.string(),
  estimatedTime: z.number(),
  hints: z.array(z.string()),
  solution: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  isActive: z.boolean(),
});

export async function listProblems(filters?: {
  type?: string;
  difficulty?: number;
  category?: string;
  tags?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get('/problems', { params: filters });
  return z.object({
    success: z.boolean(),
    data: z.array(ProblemSchema),
    pagination: z.object({
      limit: z.number(),
      offset: z.number(),
      total: z.number(),
      hasMore: z.boolean(),
    }),
  }).parse(data);
}

export async function getProblem(id: string) {
  const { data } = await api.get(`/problems/${id}`);
  return z.object({ success: z.boolean(), data: ProblemSchema }).parse(data);
}

export async function getCategories() {
  const { data } = await api.get('/problems/categories');
  return z.object({ success: z.boolean(), data: z.array(z.string()) }).parse(data);
}

export async function getTags() {
  const { data } = await api.get('/problems/tags');
  return z.object({ success: z.boolean(), data: z.array(z.string()) }).parse(data);
}
```

## sessions.ts — Sessions API

```typescript
// client/src/api/sessions.ts
import { api } from './client';
import { z } from 'zod';

const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  problemId: z.string().optional(),
  problemText: z.string(),
  problemType: z.string(),
  difficultyLevel: z.number(),
  status: z.enum(['active', 'completed', 'paused', 'abandoned']),
  startTime: z.string(),
  endTime: z.string().optional(),
  totalDuration: z.number().optional(),
  interactionCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export async function createSession(payload: {
  problemId?: string;
  problemText: string;
  problemType: string;
  difficultyLevel?: number;
}) {
  const { data } = await api.post('/sessions', payload);
  return z.object({ success: z.boolean(), data: SessionSchema }).parse(data);
}

export async function getSession(id: string) {
  const { data } = await api.get(`/sessions/${id}`);
  return z.object({ success: z.boolean(), data: SessionSchema }).parse(data);
}

export async function listSessions(filters?: {
  limit?: number;
  offset?: number;
  status?: string;
}) {
  const { data } = await api.get('/sessions', { params: filters });
  return z.object({
    success: z.boolean(),
    data: z.array(SessionSchema),
    pagination: z.object({ limit: z.number(), offset: z.number(), total: z.number() }),
  }).parse(data);
}

export async function addInteraction(sessionId: string, payload: {
  type: string;
  content: string;
  metadata?: any;
  processingTime?: number;
  confidenceScore?: number;
}) {
  const { data } = await api.post(`/sessions/${sessionId}/interactions`, payload);
  return data;
}

export async function updateSessionStatus(sessionId: string, status: string, endTime?: Date) {
  const { data } = await api.patch(`/sessions/${sessionId}`, { status, endTime });
  return data;
}
```

* * *

Math Rendering with KaTeX
==========================

## Setup
```bash
cd client
npm install katex react-katex
npm install -D @types/katex
```

## MathRenderer Component

```typescript
// client/src/components/session/MathRenderer.tsx
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
  content: string; // Mixed text with $inline$ and $$block$$ LaTeX
}

export function MathRenderer({ content }: MathRendererProps) {
  const parts = parseLatex(content);

  return (
    <div className="math-content">
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.value}</span>;
        if (part.type === 'inline') 
          return <InlineMath key={i} math={part.value} errorColor="#F87171" />;
        if (part.type === 'block') 
          return <BlockMath key={i} math={part.value} errorColor="#F87171" />;
      })}
    </div>
  );
}

function parseLatex(text: string): Array<{
  type: 'text' | 'inline' | 'block';
  value: string;
}> {
  const parts: any[] = [];
  let remaining = text;

  // Match $$...$$ (block) first, then $...$ (inline)
  const blockRegex = /\$\$(.*?)\$\$/gs;
  const inlineRegex = /\$(.*?)\$/g;

  let lastIndex = 0;
  
  // Find all block math
  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      // Add text before block
      const textBefore = text.slice(lastIndex, match.index);
      parts.push(...parseInlineMath(textBefore));
    }
    parts.push({ type: 'block', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text (handle inline math)
  if (lastIndex < text.length) {
    parts.push(...parseInlineMath(text.slice(lastIndex)));
  }

  return parts;
}

function parseInlineMath(text: string) {
  const parts: any[] = [];
  const inlineRegex = /\$(.*?)\$/g;
  let lastIndex = 0;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'inline', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}
```

## Usage in MessageBubble

```typescript
// client/src/components/session/MessageBubble.tsx
<div className="message-content">
  <MathRenderer content={message.content} />
</div>
```

* * *

Error Handling & Loading States
================================

## Global ErrorBoundary

```typescript
// client/src/components/shared/ErrorBoundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-[#0B0F14] p-4">
            <div className="rounded-2xl border border-red-500/20 bg-[#11151B] p-8 text-center">
              <h2 className="text-xl font-semibold text-red-400">Something went wrong</h2>
              <p className="mt-2 text-slate-400">{this.state.error?.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-xl bg-red-500/10 px-4 py-2 hover:bg-red-500/20"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

## TanStack Query Error Handling

```typescript
// client/src/hooks/useProblems.ts
import { useQuery } from '@tanstack/react-query';
import { listProblems } from '@/api/problems';
import { uiStore } from '@/store/uiStore';

export function useProblems(filters?: any) {
  return useQuery({
    queryKey: ['problems', filters],
    queryFn: () => listProblems(filters),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error: any) => {
      uiStore.getState().showToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to load problems',
      });
    },
  });
}
```

## Loading Skeletons

```typescript
// client/src/components/problems/ProblemListSkeleton.tsx
export function ProblemListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-white/5 bg-[#11151B] p-5"
        >
          <div className="h-6 w-3/4 rounded bg-white/10" />
          <div className="mt-2 h-4 w-full rounded bg-white/5" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 rounded-full bg-white/5" />
            <div className="h-6 w-16 rounded-full bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Error State Component

```typescript
// client/src/components/shared/ErrorState.tsx
interface ErrorStateProps {
  error: Error;
  retry?: () => void;
}

export function ErrorState({ error, retry }: ErrorStateProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <div className="text-red-400">⚠️</div>
        <h3 className="mt-4 text-lg font-semibold">Something went wrong</h3>
        <p className="mt-2 text-slate-400">{error.message}</p>
        {retry && (
          <button
            onClick={retry}
            className="mt-4 rounded-xl bg-cyan-300/10 px-4 py-2 hover:bg-cyan-300/20"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
```

* * *

Socket.IO Implementation (Detailed)
====================================

## socket.ts — Connection management

```typescript
// client/src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { authStore } from '@/store/authStore';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const socketURL = baseURL.replace('/api/v1', '');

    socket = io(socketURL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        const token = authStore.getState().token;
        cb({ token });
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socket.on('error', (err) => {
      console.error('[Socket] Error:', err);
    });
  }

  return socket;
}

export function connectSocket() {
  const sock = getSocket();
  if (!sock.connected) {
    sock.connect();
  }
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
```

## useSocket Hook

```typescript
// client/src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    connectSocket();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      // Don't disconnect here - keep connection alive across component mounts
    };
  }, []);

  return { socket, connected };
}
```

## Collaboration Events

```typescript
// client/src/pages/Collaboration.tsx
import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

export function CollaborationPage() {
  const { socket, connected } = useSocket();
  const [participants, setParticipants] = useState<any[]>([]);
  const [sharedNote, setSharedNote] = useState('');
  const roomId = 'room-123'; // Get from URL params

  useEffect(() => {
    if (!connected) return;

    // Join room
    socket.emit('room:join', { roomId, userId: 'current-user-id' });

    // Listen for presence updates
    socket.on('presence:update', (data) => {
      setParticipants(data.participants);
    });

    // Listen for shared note edits
    socket.on('note:edit', (data) => {
      setSharedNote(data.content);
    });

    // Cleanup
    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('presence:update');
      socket.off('note:edit');
    };
  }, [connected, roomId]);

  function handleNoteEdit(content: string) {
    setSharedNote(content); // Optimistic update
    socket.emit('note:edit', { roomId, content });
  }

  return (
    <div>
      <h2>Participants ({participants.length})</h2>
      <ul>
        {participants.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
      <textarea value={sharedNote} onChange={(e) => handleNoteEdit(e.target.value)} />
    </div>
  );
}
```

* * *

Accessibility (a11y) Checklist
================================

## Keyboard Navigation
- [ ] All interactive elements focusable with Tab
- [ ] Custom focus ring: `focus:ring-2 focus:ring-cyan-400/50 focus:outline-none`
- [ ] Skip links for main content: `<a href="#main" className="sr-only focus:not-sr-only">`
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys navigate lists/menus

## Screen Readers
- [ ] Semantic HTML (`<nav>`, `<main>`, `<article>`, `<section>`)
- [ ] ARIA labels on icon-only buttons: `aria-label="Close"`
- [ ] `aria-live="polite"` on toast notifications
- [ ] Alt text on all images (especially problem figures)
- [ ] Form labels associated with inputs

## Color & Contrast
- [ ] Text contrast >= 4.5:1 (WCAG AA)
- [ ] Focus indicators visible in all states
- [ ] Don't rely on color alone (use icons + text)

## Motion
- [ ] Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Testing
- **axe DevTools** (browser extension)
- **Playwright a11y tests**: 
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('dashboard should be accessible', async ({ page }) => {
  await page.goto('/dashboard');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

* * *

Performance Optimization
=========================

## Code Splitting (Lazy Loading)

```typescript
// client/src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/shared/LoadingSpinner';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Problems = lazy(() => import('./pages/Problems'));
const SessionPage = lazy(() => import('./pages/SessionPage'));
const Analytics = lazy(() => import('./pages/Analytics'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

## Image Optimization
- Use WebP format with PNG fallback
- Lazy load images below fold: `loading="lazy"`
- Responsive images with srcset

## Bundle Analysis
```bash
cd client
npm install -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, gzipSize: true, brotliSize: true }),
  ],
});
```

## React Performance
- Wrap expensive components: `React.memo(Component)`
- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function references
- Virtualize long lists with `react-window` or `@tanstack/react-virtual`

## Lighthouse Targets
- Performance: > 90
- Accessibility: 100
- Best Practices: 100
- SEO: > 90

* * *

Testing Strategy (Detailed)
============================

## Unit Tests (Vitest)

```typescript
// client/src/api/__tests__/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { api } from '../client';
import { authStore } from '@/store/authStore';

describe('API Client', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  it('attaches auth token to requests', async () => {
    authStore.getState().setToken('test-token');
    mock.onGet('/test').reply(200, { success: true });

    await api.get('/test');

    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer test-token');
  });

  it('refreshes token on 401 and retries', async () => {
    authStore.getState().setToken('expired-token');
    authStore.getState().refreshToken = 'refresh-token';

    // First request fails with 401
    mock.onGet('/protected').replyOnce(401);
    // Refresh succeeds
    mock.onPost('/auth/refresh').replyOnce(200, {
      token: 'new-token',
      refreshToken: 'new-refresh-token',
    });
    // Retry succeeds
    mock.onGet('/protected').replyOnce(200, { data: 'success' });

    const response = await api.get('/protected');
    expect(response.data.data).toBe('success');
  });
});
```

## Component Tests

```typescript
// client/src/components/problems/__tests__/ProblemCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProblemCard } from '../ProblemCard';

describe('ProblemCard', () => {
  const mockProblem = {
    id: '1',
    title: 'Quadratic Equations',
    description: 'Solve x² - 5x + 6 = 0',
    tags: ['algebra', 'quadratic'],
    type: 'math',
    difficultyLevel: 3,
  };

  it('renders problem title and tags', () => {
    render(<ProblemCard problem={mockProblem} onStart={vi.fn()} />);
    
    expect(screen.getByText('Quadratic Equations')).toBeInTheDocument();
    expect(screen.getByText('algebra')).toBeInTheDocument();
    expect(screen.getByText('quadratic')).toBeInTheDocument();
  });

  it('calls onStart when button clicked', async () => {
    const onStart = vi.fn();
    render(<ProblemCard problem={mockProblem} onStart={onStart} />);
    
    await userEvent.click(screen.getByText('Start Socratic Session'));
    expect(onStart).toHaveBeenCalledWith(mockProblem.id);
  });
});
```

## E2E Tests (Playwright)

```typescript
// client/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button:has-text("Login")');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Welcome back')).toBeVisible();
});

test('start study session flow', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button:has-text("Login")');
  
  // Navigate to problems
  await page.click('text=Problems');
  await expect(page).toHaveURL('/problems');
  
  // Start a session
  await page.click('text=Quadratic Equations');
  await page.click('button:has-text("Start Socratic Session")');
  
  await expect(page).toHaveURL(/\/session\/.+/);
  await expect(page.locator('[data-testid="chat-pane"]')).toBeVisible();
  await expect(page.locator('[data-testid="evidence-pane"]')).toBeVisible();
});
```

## Test Coverage Targets
- **Unit tests**: > 80% coverage
- **Integration tests**: All critical user flows
- **E2E tests**: Happy paths + error scenarios

* * *

Deployment
==========

## Environment Variables

### Development (client/.env.local)
```
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### Production (client/.env.production)
```
VITE_API_BASE_URL=https://api.socrateach.com/api/v1
```

## Build
```bash
cd client
npm run build
# Output: client/dist/ (static assets ready for deployment)
```

## Hosting Options

### Vercel (Recommended)
1. Connect GitHub repo
2. Set root directory: `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env vars in dashboard
6. Auto deploys on push to main

### Netlify
- Similar to Vercel
- Drag-and-drop deploy or connect Git
- Configure redirects for SPA routing

### AWS S3 + CloudFront
- S3 for static hosting
- CloudFront CDN for global distribution
- Route 53 for DNS

## SPA Routing Fix

**Vercel** (`client/vercel.json`):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Netlify** (`client/_redirects`):
```
/*  /index.html  200
```
