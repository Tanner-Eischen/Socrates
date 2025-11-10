# Architecture & Separation

This project is a monorepo with a clear separation between frontend (React) and backend (Node/Express + Socket.IO). The CLI uses the same tutoring engine as the API.

## Modules

- Frontend (`client/`)
  - React app (Vite) with pages, components, hooks, and tests.
  - Entry: `client/src/main.tsx`, `client/src/App.tsx`.
  - Dev: `npm --prefix client run dev`. Build: `npm --prefix client run build`.

- Backend (`src/api/`)
  - Express REST API, WebSocket handlers, middleware, services.
  - Dev: `npm run api:dev`. Build: `npm run build`, run with `npm run start`.

- CLI (`src/cli/` + `bin/`)
  - Tutor commands (`chat`, `demo`, `run`, `problems`).
  - Launch via `bin/socrates` or `bin/socrateach`.

<!-- Experimental UI (NewCSS) was previously for prototypes; it has been removed. -->

## Boundaries

- Do not import backend files into the frontend (`client/`). Use HTTP (`client/src/api.ts`) and Socket.IO (`client/src/lib/socket.ts`) to communicate.
- Keep shared types limited and stable. If sharing types becomes necessary, introduce a dedicated `shared/` package later instead of cross-imports.
- Environment variables:
  - Frontend: `client/.env*` (Vite, `VITE_*`).
  - Backend: root `.env` (`PORT`, `JWT_*`, `OPENAI_API_KEY`, etc.).

## Entry Points

- API server: `src/api/index.ts` and `src/api/server.ts`.
- WebSocket handlers: `src/api/websocket/handlers.ts`.
- CLI entry: `src/cli/index.ts`.

## Development Flows

- Frontend-only: `npm --prefix client run dev`.
- Backend-only: `npm run api:dev`.
- CLI demos: `node ./bin/socrates demo --scenario algebra-beginner`.

## Testing

- Frontend: `npm --prefix client test` and vitest configs in `client/`.
- Backend/engine validation: `npm run test:all` (runs problem types, context validation, adaptive difficulty).

## Linting

- Backend: `npm run lint`.
- Frontend: `npm run lint:client` or run inside `client/`.

## Future Enhancements

- Optional `shared/` package for cross-cutting types.
- `dev:all` cross-platform script using `concurrently` (if added) or PowerShell scripts on Windows.
- CI workflows to lint/test frontend and backend separately.