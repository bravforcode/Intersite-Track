# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

1. **Install dependencies**: `npm install`
2. **Set up environment**: Copy `.env.example` to `.env` and fill in Firebase & LINE config
3. **Create test accounts**: See [SETUP_TEST_ACCOUNTS.md](./SETUP_TEST_ACCOUNTS.md)
4. **Start dev server**: `npm run dev`

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
- **Firebase Admin SDK (Backend)**:
  - `FIREBASE_PROJECT_ID` (from Firebase console → Project Settings)
  - `FIREBASE_CLIENT_EMAIL` (from service account JSON)
  - `FIREBASE_PRIVATE_KEY` (from service account JSON; copy the full key including newlines)
- **Firebase JS SDK (Frontend/Vite)**:
  - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (all from Firebase console → Project Settings → Web apps)
- **LINE Messaging API**:
  - `LINE_CHANNEL_ACCESS_TOKEN` (from LINE Developers console)
  - `LINE_ADMIN_USER_ID` (your LINE User ID)
  - `LINE_GROUP_ID` (group ID for notifications; e.g., `C...`)
- **Trello API** (for auto-update script):
  - `TRELLO_API_KEY`, `TRELLO_TOKEN` (from Trello Power-Ups admin)
  - `TRELLO_BOARD_ID` (e.g., `TCoZ8cCj`)
- **Application**: `NODE_ENV`, `PORT` (optional)

## Architecture

**Single process dev**: In dev mode, Vite runs as middleware inside the Express server (`server.ts`). The same process serves the API and the React SPA — no separate `npm start` for the frontend. Port 3694.

### Auth Flow (Firebase Auth + Firestore)

```text
Frontend                      Firebase Auth            Backend
─────────────                 ──────────────────       ────────────────
1. signInWithEmailAndPassword() → validate email+pw
                          ←   return Firebase JWT
2. POST /api/auth/profile     (with Firebase JWT)  →   adminAuth.verifyIdToken(token)
                                                   →   db.collection("users").doc(uid).get()
                                                   ←   return { id, role, dept, position }
3. API calls: Authorization: Bearer [Firebase JWT]
4. Middleware: adminAuth.verifyIdToken(token) → req.user (30s cache)
```

- Frontend: `src/lib/firebase.ts` (Firebase JS SDK), `src/services/authService.ts` (signInWithEmailAndPassword, signOut, etc.)
- Backend JWT verification: `server/middleware/auth.middleware.ts` via `adminAuth.verifyIdToken()`
- Backend admin client: `server/config/firebase-admin.ts` (Firebase Admin SDK)
- User creation: `POST /api/users` creates Firebase Auth user first, then Firestore profile; rolls back Auth user on DB failure

### Backend (`server/`)

Layered MVC structure:

| Layer | Path |
| --- | --- |
| Entry & middleware | `server.ts`, `server/middleware/` |
| Routes (aggregated) | `server/routes/index.ts` |
| Controllers | `server/controllers/` |
| DB queries | `server/database/queries/` |
| DB connection | `server/database/connection.ts` (re-exports `db`, `FieldValue`, `Timestamp` from firebase-admin) |
| DB schema | Collections: `users`, `tasks`, `task_checklists`, `task_updates`, `task_comments`, `notifications`, `departments`, `task_types`, `projects`, `task_audit_logs`, `trello_config`, `trello_card_mappings`, `trello_user_mappings` (managed manually, no migrations) |
| Firebase admin client | `server/config/firebase-admin.ts` |

Auth flow: `requireAuth` middleware verifies the Firebase ID token (with cache), looks up the app user by UID, sets `req.user`. `requireRole("admin")` guards admin-only endpoints.

### Frontend (`src/`)

**No React Router** — `App.tsx` holds a single `activeTab` state variable and conditionally renders page components. All navigation is tab switching.

Auth state is managed via `auth.onAuthStateChanged()` in `App.tsx`. On sign-in, the app profile is fetched from `/api/auth/profile`. On sign-out, user state is cleared.

Global state (tasks, users, departments, task types, stats, notifications) lives in `App.tsx` and is re-fetched on every tab change. Notifications are also polled every 30 s via `setInterval`.

All API calls go through `src/services/api.ts`, which uses a `firebaseAdapter` object that mimics the Supabase client interface. It reads the token via `auth.currentUser.getIdToken()`. A 401 response triggers `auth.signOut()` then redirects to login.

### Database

Cloud Firestore (NoSQL). Collections: `users`, `tasks` (with denormalized `assignees: string[]`, `assignee_details`, `creator_name`), `task_checklists`, `task_updates`, `task_comments`, `notifications`, `departments`, `task_types`, `projects`, `task_audit_logs`. Trello integration collections: `trello_config`, `trello_card_mappings`, `trello_user_mappings`. No RLS needed; Firebase Security Rules handle access control.

### LINE & Trello Integration

**LINE Messaging**: `server/services/line.service.ts` sends notifications to both individual users (via `LINE_ADMIN_USER_ID`) and a LINE Group (via `LINE_GROUP_ID`, using `Promise.allSettled` so group failures don't block individual notifications). User `line_user_id` field is stored in Firestore.

**Trello Auto-update**: `scripts/update-trello.ts` (Node.js, uses `spawnSync` for git commands — not `execSync`, per security hook) reads git log since internship start (2026-01-12), calculates week number, and creates Trello cards/lists on the configured board.

**Word Doc Tutorial**: `scripts/generate-firebase-doc.py` (Python, requires `pip install python-docx`) generates a Firestore integration guide for the CWIE report.

## Code Style

- ESLint: `@typescript-eslint/recommended` + `react-hooks/recommended`. Warn on `any`, unused vars (except `_`-prefixed), and `console.log` (allows `warn`/`error`).
- Prettier: semicolons on, double quotes, 100-char width, trailing commas (ES5), no arrow parens for single params.
