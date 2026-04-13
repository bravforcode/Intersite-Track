# TaskAm Improvement Roadmap: 55/100 → 100/100

**Current Status**: 55/100 (Internal Beta)  
**Target**: 100/100 (Production-Ready)  
**Build Status**: ✅ Passing (TypeScript + Tests)

## Completed Improvements ✅

### Fast Wins (5/5 Complete)
- ✅ KPI and Template API routes verified correct
- ✅ Reports tab visibility enforced (admin-only)
- ✅ Backend/api typecheck included in tsconfig.json  
- ✅ Modal accessibility enhanced (role, aria-modal, Escape, focus trap)
- ✅ initDB() now fails hard on Firestore unavailable (production safety)

### Critical Security Fixes (4/4 Complete)
- ✅ Password verification enforced (old password required)
- ✅ Token storage secured (in-memory, not persisted to sessionStorage)
- ✅ File uploads hardened (public /uploads removed, auth endpoint required)
- ✅ Time-entry authorization fixed (task access verified on stop/delete)

---

## Remaining Work (16/20 Tasks)

### Priority 1: DEPLOYMENT FIXES (Critical)
**Goal**: Enable production deployment on Vercel  
**Effort**: High | **Impact**: Critical | **Score Impact**: +12 pts

#### Task 10.1: Fix Vercel Routing & Serverless Entry
**Changes Required**:
```
1. Verify backend/api/[...all].ts imports work correctly
2. Configure vercel.json for static frontend + API backend split
3. Test cold start performance
4. Ensure environment variables load correctly
```

**Files to Update**:
- `backend/api/[...all].ts` - Verify imports resolve when deployed
- `vercel.json` - Add explicit build/routing config:
  ```json
  {
    "buildCommand": "npm run build:be && npm run build:fe",
    "outputDirectory": ".",
    "routes": [
      { "src": "/api/(.*)", "dest": "/backend/api/[...all].ts" },
      { "src": "/(.*)", "dest": "/frontend/dist/index.html" }
    ]
  }
  ```
- `frontend/vite.config.ts` - Ensure dist output is correct
- Set `DATABASE_URL` and `FIREBASE_*` in Vercel environment

#### Task 10.2: Add Health Check Endpoint
```typescript
// GET /api/readiness - returns 200 when ready to receive traffic
// GET /api/liveness - returns 200 if service is alive
// Useful for Vercel load balancing and monitoring
```

**Implementation**:
```typescript
// backend/src/routes/health.routes.ts
export async function readiness(req: Request, res: Response) {
  try {
    await db.collection('_health').limit(1).get();
    res.json({ status: 'ready', timestamp: Date.now() });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
}
```

---

### Priority 2: QUERY OPTIMIZATION (High Impact)
**Goal**: Eliminate O(n) Firestore scans, enable 10x data volume  
**Effort**: Very High | **Impact**: High | **Score Impact**: +15 pts

#### Task 11.1: Replace Full-Collection Reads with Indexed Queries

**Current Problems**:
- `task.queries.ts` loads all tasks and filters in memory
- `project.queries.ts` does full collection scan on every list
- `report.queries.ts` aggregates raw data instead of querying precomputed views
- Cost grows linearly; latency becomes unacceptable at scale

**Required Changes**:

##### Task Query Pattern
```typescript
// ❌ BAD: Full scan
const tasks = await db.collection('tasks').get();
return tasks.docs.filter(d => d.data().project_id === projectId);

// ✅ GOOD: Indexed query
async function findTasksByProject(projectId: string) {
  return db.collection('tasks')
    .where('project_id', '==', projectId)
    .where('deleted_at', '==', null)
    .orderBy('created_at', 'desc')
    .limit(100)
    .get();
}
```

##### Project Query Pattern  
```typescript
// ✅ Indexed queries for list operations
async function findProjectsByDepartment(deptId: string) {
  return db.collection('projects')
    .where('department_id', '==', deptId)
    .where('deleted_at', '==', null)
    .orderBy('updated_at', 'desc')
    .get();
}
```

##### Report Aggregation Pattern
```typescript
// Build precomputed summary collection instead of aggregating on read
// Collection: project_summaries/{projectId}
// Fields: total_tasks, completed_tasks, total_hours, last_updated

async function getProjectSummary(projectId: string) {
  return db.collection('project_summaries').doc(projectId).get();
}

// Update via Firestore Function on task changes
```

**Files to Refactor**:
- `backend/src/database/queries/task.queries.ts` (15+ queries)
- `backend/src/database/queries/project.queries.ts` (8+ queries)
- `backend/src/database/queries/report.queries.ts` (12+ queries)
- `backend/src/database/queries/user.queries.ts` (6+ queries)

#### Task 11.2: Add Firestore Composite Indexes
Every `where(...).orderBy(...)` combination needs an index.

**Required Indexes** (sample):
```yaml
indexes:
  - collectionGroup: tasks
    fields:
      - project_id (Ascending)
      - deleted_at (Ascending)
      - created_at (Descending)
  
  - collectionGroup: tasks
    fields:
      - department_id (Ascending)
      - status (Ascending)
      - updated_at (Descending)
  
  # Add ~25 more for full coverage
```

**Deploy**:
```bash
firebase deploy --only firestore:indexes
```

#### Task 11.3: Implement Pagination on All List Endpoints
```typescript
// Return cursor-based pagination instead of loading everything
interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

async function listTasks(
  projectId: string,
  limit: number = 50,
  cursor?: string
): Promise<PaginatedResponse<Task>> {
  let query = db.collection('tasks')
    .where('project_id', '==', projectId)
    .orderBy('created_at', 'desc')
    .limit(limit + 1); // +1 to detect if there are more

  if (cursor) {
    // Decode cursor to get the last document
    const lastDoc = await getDocumentFromCursor(cursor);
    query = query.startAfter(lastDoc);
  }

  const snap = await query.get();
  const hasMore = snap.docs.length > limit;
  const items = snap.docs.slice(0, limit).map(toTask);
  const nextCursor = hasMore ? toCursor(snap.docs[limit - 1]) : undefined;

  return { items, nextCursor, hasMore, total: limit };
}
```

---

### Priority 3: COMPREHENSIVE TESTING (High)
**Goal**: 80%+ coverage with E2E, integration, unit tests  
**Effort**: Very High | **Impact**: High | **Score Impact**: +12 pts

#### Task 13: Add E2E Playwright Tests
```typescript
// tests/e2e/critical-flows.spec.ts
test.describe('Critical User Journeys', () => {
  test('staff can login → view dashboard → list tasks → create task', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type=email]', 'staff@test.com');
    await page.fill('input[type=password]', 'password123');
    await page.click('button:has-text("เข้าสู่ระบบ")');
    
    // Wait for dashboard
    await page.waitForURL('/');
    await expect(page.locator('h2:has-text("ข้อมูลรวม")')).toBeVisible();
    
    // Verify sidebar navigation
    await page.click('text=งาน');
    await page.waitForURL('/tasks');
    
    // Create task
    await page.click('button:has-text("เพิ่มงานใหม่")');
    await page.fill('[placeholder="ชื่องาน"]', 'Test Task');
    await page.click('button:has-text("บันทึก")');
    
    // Verify success
    await expect(page.locator('text=Test Task')).toBeVisible();
  });

  test('prevent unauthorized access to other user tasks', async ({ page, context }) => {
    // Login as staff1
    await page.goto('/');
    await loginAs(page, 'staff1@test.com', 'password123');
    
    // Navigate to tasks
    await page.goto('/tasks');
    
    // Try direct API access to staff2's task
    const response = await context.request.get('/api/tasks/staff2_task_id');
    expect(response.status()).toBe(403);
  });
});
```

#### Task 14: Authorization Integration Tests
```typescript
// tests/integration/authorization.spec.ts
describe('Task Authorization', () => {
  it('staff cannot modify tasks outside their project', async () => {
    const staffUser = { id: 'staff1', role: 'staff', project_id: 'proj1' };
    const otherTask = { id: 'task2', project_id: 'proj2' };
    
    const access = await ensureTaskAccess(staffUser, otherTask.id);
    expect(access.ok).toBe(false);
    expect(access.status).toBe(403);
  });

  it('admin can modify any task', async () => {
    const adminUser = { id: 'admin1', role: 'admin' };
    const anyTask = { id: 'task-anywhere', project_id: 'any-proj' };
    
    const access = await ensureTaskAccess(adminUser, anyTask.id);
    expect(access.ok).toBe(true);
  });

  it('time entry requires task access', async () => {
    const res = await request(app)
      .patch('/api/time-entries/entry1/stop')
      .set('Authorization', `Bearer ${staffToken}`)
      .send();
    
    // Should check task access first
    expect(res.status).toBe(403);
  });
});
```

#### Task 15: Contract Tests  
```typescript
// tests/contracts/api.contracts.spec.ts
describe('API Contracts', () => {
  it('/api/tasks returns consistent response shape', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.body).toMatchSchema({
      items: Array,
      total: Number,
      nextCursor: String,
    });
  });
});
```

---

### Priority 4: DOCUMENTATION & OPERATIONAL READINESS
**Goal**: Accurate, up-to-date technical docs  
**Effort**: Medium | **Impact**: Medium | **Score Impact**: +8 pts

####  Task 16: Audit & Update Documentation
**Files to Review/Update**:
- [ ] `docs/CLAUDE.md` - Update deployment model (was single-process, now separate frontend/backend)
- [ ] `docs/FIREBASE-TUTORIAL.md` - Verify Firestore schema matches code
- [ ] `docs/SECURITY_FIXES_PLAN.md` - Mark completed items
- [ ] `README.md` - Add deployment instructions, new security improvements
- [ ] Create `ARCHITECTURE.md` - Document layers, boundaries, data flow

---

### Priority 5: OBSERVABILITY & MONITORING
**Goal**: Debug issues in production, measure performance  
**Effort**: Medium | **Impact**: Medium | **Score Impact**: +6 pts

#### Task 19: Add Structured Logging
```typescript
// Create logger singleton
import winston from 'winston';

export const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Use in controllers
logger.info('Task created', { taskId, userId, projectId });
logger.error('Database connection failed', { error: err.message });
```

#### Task 20: Add APM/Metrics
Monitor:
- Request latency (p50, p95, p99)
- Database query duration
- Error rates by endpoint
- Firestore read/write counts

---

## Scoring Impact Analysis

| Task                          | Group    | Points | Completion | Total |
|-------------------------------|----------|--------|------------|-------|
| Fast Wins & Security (9)      | Complete | +9     | 100%       | +9    |
| Deployment Fixes              | High     | +15    | 0%         | 0     |
| Query Optimization            | High     | +15    | 0%         | 0     |
| Testing                       | High     | +12    | 0%         | 0     |
| Docs & Monitoring             | Medium   | +14    | 0%         | 0     |
| **Total Potential**           |          | **100**| 9%         | **9** |

**To reach 100/100**, focus completion sequence:
1. Deployment (Quick Wins on Vercel)
2. Query Optimization (Biggest performance impact)  
3. Testing (Ensures stability)
4. Documentation (Operational readiness)

---

## Build & Test Commands

```bash
# Full build and test
npm run build && npm run lint && npm test

# Backend only
cd backend && npm run build && npm test

# Frontend only
cd frontend && npm run build && npm run test

# E2E tests (requires running services)
npm run test:e2e

# Production deployment
npm run build
vercel deploy --prod
```

---

## Next Steps

1. **Immediate** (30 min): Deploy Vercel fixes to get baseline deployment working
2. **Short-term** (2-3 days): Implement indexed queries for project/task lists
3. **Medium-term** (4-5 days): Add Playwright E2E tests for critical flows
4. **Long-term** (Weekly): Extend query optimization to reports and analytics

Once deployed, scores will improve significantly:
- **Build/Deploy**: +15 pts (from currently not deployable)
- **Performance**: +15 pts (from query optimization)
- **Testing**: +12 pts (from E2E coverage)
- **Architecture**: +12 pts (from documentation clarity)

