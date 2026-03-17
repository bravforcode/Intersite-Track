# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start full-stack dev server (Express + Vite, port 3694)
npm run build     # Vite production build → dist/
npm run preview   # Preview production build
npm run clean     # Delete dist/
npm run lint      # TypeScript type-check only (tsc --noEmit); no ESLint script
```

No test runner is configured. TypeScript strict checks are the primary correctness gate.

## Environment

Copy `.env.example` to `.env` and fill in:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (from Supabase dashboard → Settings → API)
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` (from Supabase dashboard → Settings → Database), `PGSSL=true`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (same values as above, with `VITE_` prefix for Vite)
- `NODE_ENV`, `PORT` (optional)

Supabase project: `eezrhwiwwsmarkvejeoi` (ap-southeast-1, "Intersite Track")

## Architecture

**Single process dev**: In dev mode, Vite runs as middleware inside the Express server (`server.ts`). The same process serves the API and the React SPA — no separate `npm start` for the frontend. Port 3694.

### Auth Flow (Supabase Auth)

```
Frontend                      Supabase Auth            Backend
─────────────                 ──────────────────       ────────────────
1. signInWithPassword()   →   validate email+pw
                          ←   return JWT session
2. POST /api/auth/profile     (with Supabase JWT)  →   supabaseAdmin.auth.getUser(token)
                                                   →   SELECT user WHERE auth_id = sub
                                                   ←   return { id, role, dept, position }
3. API calls: Authorization: Bearer [Supabase JWT]
4. Middleware: supabaseAdmin.auth.getUser(token) → req.user
```

- Frontend: `src/lib/supabase.ts` (anon key browser client), `src/services/authService.ts`
- Backend JWT verification: `server/middleware/auth.middleware.ts` via `supabaseAdmin.auth.getUser()`
- Backend admin client: `server/config/supabase.ts` (service_role key, bypasses RLS)
- User creation: `POST /api/users` creates Supabase Auth user first, then DB profile; rolls back Auth user on DB failure

### Backend (`server/`)

Layered MVC structure:

| Layer | Path |
|---|---|
| Entry & middleware | `server.ts`, `server/middleware/` |
| Routes (aggregated) | `server/routes/index.ts` |
| Controllers | `server/controllers/` |
| DB queries | `server/database/queries/` |
| DB connection | `server/database/connection.ts` (pg.Pool → Supabase PG with SSL) |
| DB schema | Managed via Supabase MCP migrations (not local init) |
| Supabase admin client | `server/config/supabase.ts` |

Auth flow: `requireAuth` middleware verifies the Supabase JWT, looks up the app user by `auth_id`, sets `req.user`. `requireRole("admin")` guards admin-only endpoints.

Trello sync is **fire-and-forget** with 3 retries (30 s delay): task create/update/delete in controllers call `trelloSyncService` only when Trello credentials are stored in the database.

### Frontend (`src/`)

**No React Router** — `App.tsx` holds a single `activeTab` state variable and conditionally renders page components. All navigation is tab switching.

Auth state is managed via `supabase.auth.onAuthStateChange()` in `App.tsx`. On `SIGNED_IN`, the app profile is fetched from `/api/auth/profile`. On `SIGNED_OUT`, user state is cleared.

Global state (tasks, users, departments, task types, stats, notifications) lives in `App.tsx` and is re-fetched on every tab change. Notifications are also polled every 30 s via `setInterval`.

All API calls go through `src/services/api.ts`, which reads the token from `supabase.auth.getSession()`. A 401 response triggers `supabase.auth.signOut()` then redirects to login.

### Database

PostgreSQL via `pg` (pool-based, SSL enabled for Supabase). Tables: `departments`, `task_types`, `users` (with `email`, `auth_id` columns), `tasks`, `task_assignments`, `task_updates`, `notifications`, `task_checklists`. Trello tables: `trello_config`, `trello_card_mappings`, `trello_status_mappings`, `trello_user_mappings`, `trello_sync_logs`. Row Level Security (RLS) is enabled; the service_role key bypasses RLS automatically.

Schema is managed by Supabase MCP migrations, not the old `initDB()` (which now only verifies connectivity).

## Code Style

- ESLint: `@typescript-eslint/recommended` + `react-hooks/recommended`. Warn on `any`, unused vars (except `_`-prefixed), and `console.log` (allows `warn`/`error`).
- Prettier: semicolons on, double quotes, 100-char width, trailing commas (ES5), no arrow parens for single params.
