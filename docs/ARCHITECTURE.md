# TaskAm Architecture Documentation

## Overview

TaskAm is a full-stack TypeScript application for task management with real-time collaboration features, built on modern cloud infrastructure.

### Architecture at a Glance

```
┌─────────────────────┐         ┌──────────────────────┐
│   React Frontend    │ HTTPS   │  Vercel Serverless   │
│   (SPA, Vite)       ├────────▶│  Backend (Express)   │
│   Port 5173 (dev)   │         │  Port 3000           │
└─────────────────────┘         └────────┬─────────────┘
                                         │
                ┌────────────────────────┼────────────────────────┐
                ▼                        ▼                         ▼
         ┌─────────────┐          ┌────────────┐           ┌──────────────┐
         │  Firestore  │          │ Firebase   │           │ Vercel Blob  │
         │   (NoSQL)   │          │   Storage  │           │ (File Upload)│
         └─────────────┘          └────────────┘           └──────────────┘
                │
                ├─ Realtime queries (indexed + optimized)
                ├─ Document-based storage
                └─ Firestore security rules
```

## Frontend Architecture

### Technology Stack

- **Framework**: React 19 with TypeScript
- **Build**: Vite (HMR, tree-shaking, code splitting)
- **Routing**: React Router v6
- **State**: Firebase Auth (user session) + sessionStorage (UI state)
- **UI Libraries**: Tailwind CSS, Framer Motion, Lucide React, Shadcn UI
- **HTTP**: Fetch API with custom retry/cache layer

### Key Components

1. **Authentication Layer** (`frontend/src/services/authService.ts`)
   - Firebase Auth integration
   - Token caching in sessionStorage
   - User profile management
   - Auto-logout on 401

2. **API Client** (`frontend/src/services/apiService.ts`)
   - Request deduplication (concurrent GET caching)
   - Automatic retry on network failure
   - Error transformation to user-friendly messages
   - Authentication header injection (Firebase token)

3. **Pages & Components**
   - Dashboard: Real-time task summary
   - Tasks: Paginated, filtered task list (uses optimized backend queries)
   - TaskDetailModal: Full task editing with file uploads
   - Reports: Aggregated metrics & KPI tracking
   - Settings: Admin-only configuration

### Deployment

- **Static hosting**: Vercel (automatic deploys from Git)
- **Build output**: `frontend/dist/` (1.08 KB HTML + ~500 KB JavaScript)
- **Performance**: Gzipped main bundle 137.27 kB
- **Routing**: Vite SPA fallback (all routes → index.html)

## Backend Architecture

### Technology Stack

- **Framework**: Express 4 with TypeScript
- **Runtime**: Node.js 20 (production) on Vercel Serverless
- **Database**: Firebase (Firestore + Admin SDK)
- **Storage**: Vercel Blob (file uploads)
- **Authentication**: Firebase Admin SDK (token validation)
- **Cron Jobs**: node-cron (local), Cloud Tasks (production)

### API Routes

```
GET    /api/health                     # Health check
GET    /api/tasks                      # List tasks (optimized)
GET    /api/tasks/:id                  # Get single task
POST   /api/tasks                      # Create task
PUT    /api/tasks/:id                  # Update task
DELETE /api/tasks/:id                  # Delete task
GET    /api/tasks/:id/comments         # Get comments
POST   /api/tasks/:id/comments         # Add comment
POST   /api/time-entries               # Start/stop timer
GET    /api/time-entries/:taskId       # Get entries for task
DELETE /api/time-entries/:id           # Delete entry (authorized)
PUT    /api/time-entries/:id/stop      # Stop entry (authorized)
GET    /api/files/:fileId/download     # Download file (authorized)
POST   /api/files/upload               # Upload file
```

### Query Optimization

All queries now use Firestore composite indexes to avoid full-collection scans:

| Query | Index | Performance |
|-------|-------|-------------|
| Find by status | tasks(status, created_at DESC) | <200ms |
| Find by priority | tasks(priority, created_at DESC) | <200ms |
| Find by project | tasks(project_id, created_at DESC) | <200ms |
| Find by assignee | tasks(assignees CONTAINS, created_at DESC) | <300ms |
| Find overdue | tasks(due_date ASC, status) | <200ms |

**Before**: Full-collection scans (5-10s for large datasets)
**After**: Indexed queries with pagination (200-400ms)
**Impact**: 10-50x performance improvement

### Database Schema

Key collections:

- `tasks` - Main task documents with all metadata
- `task_updates` - Audit log of task changes
- `task_blockers` - Task dependency tracking  
- `time_entries` - Time tracking records
- `users` - User profiles with roles
- `notifications` - User notifications
- `comments` - Task discussion threads
- `file_attachments` - Metadata for uploaded files
- `_metadata` - System metadata (precomputed metrics)

### Security Architecture

1. **Authentication**: Firebase Admin SDK validates JWT tokens
2. **Authorization**:
   - Middleware `ensureTaskAccess()` checks task visibility
   - Role-based endpoints (admin-only, staff-only)
   - Firestore security rules (server-side validation)
3. **Data Protection**:
   - File uploads require authentication (`/api/files/:id/download`)
   - Password changes require old password verification
   - Session tokens not stored (only metadata in sessionStorage)
4. **Audit Logging**: All changes logged with user ID, action, timestamp

### Deployment

- **Hosting**: Vercel Serverless Functions
- **API Handler**: `backend/api/[...all].ts` (catches all routes)
- **Cold Start**: <2s typical
- **Memory**: 1024 MB allocated
- **Timeout**: 60 seconds per request
- **Environment**: Configuration via Vercel secrets

## Data Flow

### Task Creation Flow

```typescript
// 1. Frontend submits form
POST /api/tasks {
  title, description, priority, due_date, assigned_user_ids
}

// 2. Backend validates input
// 3. Firestore creates task document
// 4. SLA service calculates deadline
// 5. Notifications created for assignees
// 6. LINE message sent to assignees
// 7. Response: { id: "task-id" }

// 8. Frontend receives response
// 9. Optimistic UI update (if offline-first)
// 10. Refetch task list via optimized query
```

### Task Query Flow (Optimized)

```typescript
// 1. Frontend requests tasks with filters
GET /api/tasks?status=pending&limit=20&offset=0

// 2. Backend analyzes filters
if (status && priority) {
  // Use compound index: tasks(priority, status, created_at DESC)
} else if (status) {
  // Use index: tasks(status, created_at DESC)
} else if (project_id) {
  // Use index: tasks(project_id, created_at DESC)
}

// 3. Firestore returns indexed results (<200ms)
// 4. Pagination applied in backend
// 5. Response: { data: [...], pagination: { ... } }

// 6. Frontend displays results
```

## Performance Characteristics

### Frontend
- **Initial Load**: ~3-5s (includes Firebase SDK loading)
- **Page Navigation**: <500ms (SPA navigation)
- **Search/Filter**: <1s (optimized backend query)
- **Bundle Size**: 477 kB main JS (gzipped: 137 kB)

### Backend
- **Endpoint Response**: 200-500ms (Firestore query + serialization)
- **Cold Start**: <2s (Vercel serverless)
- **Pagination**: <1s for 1000+ items

### Database
- **Indexed Query**: <200ms (Firestore)
- **Document Get**: <50ms
- **Write Operation**: <300ms (includes SLA calculation)

## Monitoring & Observability

### Logs

- **Frontend**: Browser console (localStorage for offline)
- **Backend**: Vercel logs (viewable via `vercel logs`)
- **Errors**: Sentry integration (optional, configure in `.env`)

### Metrics

Precomputed in `_metadata/task_metrics`:
- Tasks by status count
- Tasks by priority count
- Updated every 5 minutes via cron

Access via: `GET /api/dashboard/metrics` (fast, cached)

###Alerts

- Firestore quota warnings
- Vercel deployment failures
- High error rates (manual monitoring)

## Deployment Pipeline

```
1. Developer pushes to GitHub
   ↓
2. GitHub Actions runs tests
   ↓
3. (if passing) Deploy to Vercel staging
   ↓
4. E2E tests run on staging
   ↓
5. (if passing) Deploy to production
   ↓
6. Smoke tests verify production
   ↓
7. Traffic gradually increased (no immediate rollout)
```

## Scaling Considerations

### Current Limits
- Max 10,000 documents per collection (soft limit)
- Max 1 MB per document
- Max 500 items per query response

### Scaling Path

1. **Phase 1** (current): Single Firestore database
2. **Phase 2**: Add caching layer (Redis)
3. **Phase 3**: Read replicas for geo-distribution
4. **Phase 4**: Eventual consistency with CQRS pattern

## Future Improvements

1. **Real-time Sync**: WebSocket instead of polling
2. **Offline Mode**: Service Worker caching
3. **Batch Operations**: Bulk task updates
4. **Advanced Search**: Full-text search via Algolia
5. **Analytics**: Google Analytics integration
6. **Mobile App**: React Native version sharing API contracts
