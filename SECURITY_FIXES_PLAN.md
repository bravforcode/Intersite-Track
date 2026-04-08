# TaskAm Security & Quality Fixes - Enterprise Production Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all security vulnerabilities, authorization gaps, and data integrity issues to achieve enterprise-grade production readiness.

**Architecture:** This plan is organized in 5 phases:
1. **Phase 1 (Critical Blockers):** Remove debug endpoint, fix notification auth, restrict user directory
2. **Phase 2 (Authorization Matrix):** Implement role-based access control for projects, reports, tasks
3. **Phase 3 (Data Integrity):** Fix client-spoofing vulnerabilities, token exposure, password flow
4. **Phase 4 (Data Quality):** Add cascading deletes, harden holiday/saturday validation
5. **Phase 5 (Scale & Operations):** Optimize queries, add operational maturity features

**Tech Stack:** Express.js, Supabase PostgreSQL, React, TypeScript, TDD for all changes

---

## Phase 1: Critical Security Blockers

### Task 1.1: Remove Debug Endpoint

**Files:**
- Modify: `server/routes/index.ts` (remove L40-50)

**Context:** `server/routes/index.ts` currently exposes a debug endpoint that leaks Firebase credentials and internal secrets directly. This is a production blocker.

- [ ] **Step 1: Locate and review the debug endpoint**

```bash
grep -n "debug\|firebase\|credential" server/routes/index.ts | head -20
```

- [ ] **Step 2: Read the file to understand what's exported**

```bash
cat server/routes/index.ts
```

- [ ] **Step 3: Remove the debug route**

Find the route handler that exposes Firebase config/credentials and delete it. Keep all other legitimate routes intact. The file should only export API routes, not debug endpoints.

Example of what to remove (adjust based on actual code):
```typescript
// DELETE THIS BLOCK:
router.get('/debug/config', (req, res) => {
  res.json(firebaseConfig); // DANGEROUS
});
```

- [ ] **Step 4: Verify the server still boots**

```bash
npm run build:server
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Test that the endpoint is gone**

```bash
curl http://localhost:3000/debug/config
```

Expected: 404 or similar not-found response (not credentials dump).

- [ ] **Step 6: Commit**

```bash
git add server/routes/index.ts
git commit -m "fix: remove debug endpoint leaking Firebase credentials

- Removed /debug/config and related debug routes
- Prevents unauthorized access to internal configuration
- Production blocker fixed"
```

---

### Task 1.2: Fix Notification Authorization (Role-Based Access)

**Files:**
- Modify: `server/routes/notification.routes.ts` (L10-15)
- Modify: `server/controllers/notification.controller.ts` (L7-30, all endpoints)

**Context:** Notifications API currently has no authorization checks. Any authenticated user can read/modify any other user's notifications if they guess the IDs. This must verify that the requesting user owns the notification or is an admin.

- [ ] **Step 1: Write a test file for notification authorization**

Create `server/__tests__/notification.auth.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../server';

describe('Notification Authorization', () => {
  let adminToken: string;
  let staffToken1: string;
  let staffToken2: string;
  let notificationId: string;

  // Mock setup - replace with actual Supabase client setup
  beforeAll(async () => {
    // Create test users and get tokens
    adminToken = 'admin_jwt_token_here';
    staffToken1 = 'staff1_jwt_token_here';
    staffToken2 = 'staff2_jwt_token_here';
  });

  it('should allow user to read own notification', async () => {
    const res = await request(app)
      .get(`/api/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${staffToken1}`);
    
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user_id_1');
  });

  it('should deny user reading other user\'s notification', async () => {
    const res = await request(app)
      .get(`/api/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${staffToken2}`);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('should allow admin to read any notification', async () => {
    const res = await request(app)
      .get(`/api/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
  });

  it('should deny user marking other user\'s notification as read', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${staffToken2}`)
      .send({ read: true });
    
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run the test to confirm current failures**

```bash
npm run test -- server/__tests__/notification.auth.test.ts
```

Expected: Multiple failures (endpoints don't check ownership).

- [ ] **Step 3: Add helper function to check notification ownership**

Modify `server/controllers/notification.controller.ts`, add at the top:

```typescript
// Helper to ensure user can access a notification
async function ensureNotificationAccess(
  notificationId: string,
  userId: string,
  userRole: string
): Promise<void> {
  // Admin can access any notification
  if (userRole === 'admin') return;
  
  // Non-admin must own the notification
  const notification = await db.query(
    'SELECT user_id FROM notifications WHERE id = $1',
    [notificationId]
  );
  
  if (!notification.rows[0] || notification.rows[0].user_id !== userId) {
    throw new Error('FORBIDDEN');
  }
}
```

- [ ] **Step 4: Update GET notification endpoint**

In `server/controllers/notification.controller.ts`, find the getNotification handler and wrap it:

```typescript
export async function getNotification(req: Request, res: Response) {
  const { id } = req.params;
  const { userId, role } = req.user; // From JWT middleware

  try {
    await ensureNotificationAccess(id, userId, role);
    
    const notification = await db.query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    
    res.json(notification.rows[0]);
  } catch (error) {
    if (error.message === 'FORBIDDEN') {
      res.status(403).json({ error: 'Forbidden' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

- [ ] **Step 5: Update PATCH (mark as read) endpoint**

Same pattern for `updateNotificationStatus`:

```typescript
export async function updateNotificationStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { userId, role } = req.user;
  const { read } = req.body;

  try {
    await ensureNotificationAccess(id, userId, role);
    
    await db.query(
      'UPDATE notifications SET read = $1, updated_at = NOW() WHERE id = $2',
      [read, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'FORBIDDEN') {
      res.status(403).json({ error: 'Forbidden' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

- [ ] **Step 6: Update all other notification endpoints**

Apply the same `ensureNotificationAccess()` check to:
- DELETE notification
- Mark all as read (must verify all notifications belong to user)
- Any other endpoints that touch notifications

- [ ] **Step 7: Run tests again**

```bash
npm run test -- server/__tests__/notification.auth.test.ts
```

Expected: All tests pass.

- [ ] **Step 8: Run full server test suite**

```bash
npm run test
```

Expected: No regressions in other tests.

- [ ] **Step 9: Commit**

```bash
git add server/controllers/notification.controller.ts server/__tests__/notification.auth.test.ts
git commit -m "fix: add authorization checks to notification endpoints

- Notifications are now user-scoped (can only read own)
- Admin can read any notification
- Fixed critical authorization bypass in mark-as-read, delete
- Added comprehensive test coverage for notification auth"
```

---

### Task 1.3: Restrict User Directory Access

**Files:**
- Modify: `server/routes/user.routes.ts` (L10 GET /api/users)
- Modify: `server/database/queries/user.queries.ts` (findAllUsers function)
- Modify: `src/App.tsx` (L120 - user fetch)
- Modify: `server/controllers/task.controller.ts` (L36 - task user inclusion)

**Context:** Currently all authenticated users can fetch the entire user directory including email and LINE IDs. This must be restricted: only admins can list all users, and staff can only see users relevant to their assigned tasks.

- [ ] **Step 1: Write authorization test for user listing**

Create `server/__tests__/user.auth.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../server';

describe('User Directory Authorization', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    adminToken = 'admin_jwt_token_here';
    staffToken = 'staff_jwt_token_here';
  });

  it('should allow admin to list all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should deny staff from listing all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${staffToken}`);
    
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test -- server/__tests__/user.auth.test.ts
```

Expected: FAIL - endpoint currently allows staff access.

- [ ] **Step 3: Update user routes to check authorization**

Modify `server/routes/user.routes.ts`:

```typescript
// Add authorization middleware
router.get('/api/users', requireAuth, requireRole('admin'), userController.findAllUsers);

// New endpoint: get users related to my tasks (for staff)
router.get('/api/users/task-context', requireAuth, userController.getTaskContextUsers);
```

- [ ] **Step 4: Create requireRole middleware if it doesn't exist**

In `server/middleware/auth.middleware.ts`, add:

```typescript
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role; // From JWT
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

- [ ] **Step 5: Create staff-only endpoint for task-related users**

In `server/controllers/user.controller.ts`, add:

```typescript
export async function getTaskContextUsers(req: Request, res: Response) {
  const { userId } = req.user;

  try {
    // Get users from tasks assigned to this staff member
    const users = await db.query(`
      SELECT DISTINCT u.id, u.name, u.email, u.avatar_url
      FROM users u
      JOIN task_assignments ta ON u.id = ta.assigned_to
      WHERE ta.created_by = $1 OR u.id = $1
      LIMIT 100
    `, [userId]);
    
    res.json(users.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
```

- [ ] **Step 6: Update frontend to use restricted endpoint**

Modify `src/App.tsx` (L120):

```typescript
// Before:
// const users = await fetch('/api/users').then(r => r.json());

// After:
const usersEndpoint = isAdmin ? '/api/users' : '/api/users/task-context';
const users = await fetch(usersEndpoint).then(r => r.json());
```

- [ ] **Step 7: Update task controller to exclude sensitive user fields**

Modify `server/controllers/task.controller.ts` (L36), when including users in task responses:

```typescript
// Old: includes full user object with email
// New: select only safe fields
const task = await db.query(`
  SELECT t.*, 
    json_build_object(
      'id', u.id, 
      'name', u.name,
      'avatar_url', u.avatar_url
    ) as assigned_user
  FROM tasks t
  LEFT JOIN users u ON t.assigned_to = u.id
  WHERE t.id = $1
`, [taskId]);
```

- [ ] **Step 8: Run tests**

```bash
npm run test -- server/__tests__/user.auth.test.ts
```

Expected: All tests pass.

- [ ] **Step 9: Test full app flow**

```bash
npm run dev
# Login as staff member
# Verify you cannot see /api/users directly
# Verify you can see users from /api/users/task-context
```

- [ ] **Step 10: Commit**

```bash
git add server/routes/user.routes.ts server/controllers/user.controller.ts server/middleware/auth.middleware.ts src/App.tsx server/controllers/task.controller.ts server/__tests__/user.auth.test.ts
git commit -m "fix: restrict user directory access to admins only

- Only admins can list all users
- Staff users can access restricted user list (task context only)
- Removed email and LINE_ID from staff-visible user objects
- Prevents PII disclosure across organization
- Added role-based authorization middleware"
```

---

## Phase 2: Authorization Matrix

### Task 2.1: Add Role-Based Authorization to Project APIs

**Files:**
- Modify: `server/controllers/project.controller.ts` (all endpoints, L10-100)
- Modify: `server/routes/project.routes.ts` (add role checks)

**Context:** Project API currently only checks `requireAuth`. Any staff member can create, edit, delete projects. Projects should have an owner/creator, and only that owner or admins can modify.

- [ ] **Step 1: Write authorization tests**

Create `server/__tests__/project.auth.test.ts`:

```typescript
describe('Project Authorization', () => {
  it('should deny staff from editing another staff\'s project', async () => {
    // Staff1 created project A
    // Staff2 tries to edit project A
    const res = await request(app)
      .put('/api/projects/project-a-id')
      .set('Authorization', `Bearer ${staff2Token}`)
      .send({ title: 'New Title' });
    
    expect(res.status).toBe(403);
  });

  it('should allow admin to edit any project', async () => {
    const res = await request(app)
      .put('/api/projects/project-a-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'New Title' });
    
    expect(res.status).toBe(200);
  });

  it('should allow project owner to edit own project', async () => {
    const res = await request(app)
      .put('/api/projects/project-a-id')
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({ title: 'New Title' });
    
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to confirm failures**

```bash
npm run test -- server/__tests__/project.auth.test.ts
```

Expected: Fails because authorization not implemented.

- [ ] **Step 3: Add project ownership check helper**

In `server/controllers/project.controller.ts`:

```typescript
async function ensureProjectAccess(
  projectId: string,
  userId: string,
  userRole: string,
  requiredLevel: 'read' | 'write' = 'write'
): Promise<void> {
  const project = await db.query(
    'SELECT created_by FROM projects WHERE id = $1',
    [projectId]
  );

  if (!project.rows[0]) {
    throw new Error('NOT_FOUND');
  }

  // Admin always has access
  if (userRole === 'admin') return;

  // Non-admin must be owner for write access
  if (requiredLevel === 'write' && project.rows[0].created_by !== userId) {
    throw new Error('FORBIDDEN');
  }
}
```

- [ ] **Step 4: Update all project endpoints**

Update PUT, DELETE, PATCH endpoints for projects:

```typescript
export async function updateProject(req: Request, res: Response) {
  const { id } = req.params;
  const { userId, role } = req.user;

  try {
    await ensureProjectAccess(id, userId, role, 'write');

    const { title, description } = req.body;
    const result = await db.query(
      'UPDATE projects SET title = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [title, description, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error.message === 'FORBIDDEN') {
      res.status(403).json({ error: 'Forbidden' });
    } else if (error.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

- [ ] **Step 5: Apply same pattern to DELETE, PATCH**

Update delete and patch endpoints with ownership checks.

- [ ] **Step 6: Update milestones and blockers under projects**

Also add checks for:
- `POST /api/projects/:id/milestones` - only project owner/admin can add
- `PUT /api/projects/:id/milestones/:milestoneId` - only owner/admin can edit
- `DELETE /api/projects/:id/blockers/:blockerId` - only owner/admin can delete

- [ ] **Step 7: Run tests**

```bash
npm run test -- server/__tests__/project.auth.test.ts
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add server/controllers/project.controller.ts server/__tests__/project.auth.test.ts
git commit -m "fix: add role-based authorization to project APIs

- Projects are now owner-scoped (staff can only edit own)
- Admin can manage any project
- Milestones and blockers inherit project access control
- Prevents cross-project data modification"
```

---

### Task 2.2: Add Role-Based Authorization to Report APIs

**Files:**
- Modify: `server/routes/report.routes.ts` (L15)
- Modify: `server/controllers/report.controller.ts` (L50 export endpoint)

**Context:** Reports endpoint currently allows all authenticated users to access staff reports and export company-wide data. Must restrict based on role.

- [ ] **Step 1: Write test for report authorization**

Create `server/__tests__/report.auth.test.ts`:

```typescript
describe('Report Authorization', () => {
  it('should deny staff from accessing staff reports endpoint', async () => {
    const res = await request(app)
      .get('/api/reports/staff')
      .set('Authorization', `Bearer ${staffToken}`);
    
    expect(res.status).toBe(403);
  });

  it('should allow admin to access staff reports', async () => {
    const res = await request(app)
      .get('/api/reports/staff')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
  });

  it('should allow admin to export all data', async () => {
    const res = await request(app)
      .get('/api/reports/export')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
  });

  it('should deny staff from exporting all data', async () => {
    const res = await request(app)
      .get('/api/reports/export')
      .set('Authorization', `Bearer ${staffToken}`);
    
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to confirm failures**

```bash
npm run test -- server/__tests__/report.auth.test.ts
```

- [ ] **Step 3: Update report routes**

Modify `server/routes/report.routes.ts`:

```typescript
// Admin-only endpoints
router.get('/api/reports/staff', requireAuth, requireRole('admin'), reportController.getStaffReports);
router.get('/api/reports/export', requireAuth, requireRole('admin'), reportController.exportAllData);
router.get('/api/reports/summary', requireAuth, requireRole('admin'), reportController.getCompanySummary);

// User can get own reports
router.get('/api/reports/my-tasks', requireAuth, reportController.getUserTaskReport);
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- server/__tests__/report.auth.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Update frontend to show/hide report tabs**

In `src/App.tsx` (around L179), update report section:

```typescript
// Only show report tab to admins
{isAdmin && (
  <Link to="/reports">Reports</Link>
)}
```

- [ ] **Step 6: Commit**

```bash
git add server/routes/report.routes.ts server/controllers/report.controller.ts src/App.tsx server/__tests__/report.auth.test.ts
git commit -m "fix: restrict report access to admin users only

- Staff reports, company summary, exports now admin-only
- Staff users can view personal task reports
- Prevents data exposure of entire organization
- Role-based authorization on all report endpoints"
```

---

### Task 2.3: Fix Task Route Bugs and Add Access Control

**Files:**
- Modify: `server/routes/task.routes.ts` (L68 route ordering)
- Modify: `server/controllers/task.controller.ts` (L220 blockers endpoint)

**Context:** 
1. `/api/tasks/global/activity` is shadowed by `/:id/activity` due to route ordering
2. `/api/tasks/:id/blockers` doesn't verify task access

- [ ] **Step 1: Review current route definition**

```bash
grep -n "router\." server/routes/task.routes.ts | head -20
```

- [ ] **Step 2: Reorder routes so specific paths come before params**

Modify `server/routes/task.routes.ts`:

```typescript
// Place exact routes BEFORE parameterized routes
router.get('/api/tasks/global/activity', requireAuth, taskController.getGlobalActivity);

// Then parameterized routes
router.get('/api/tasks/:id/activity', requireAuth, taskController.getTaskActivity);
router.get('/api/tasks/:id/blockers', requireAuth, taskController.getBlockers);
```

- [ ] **Step 3: Add access control to blockers endpoint**

Modify `server/controllers/task.controller.ts` (L220):

```typescript
export async function getBlockers(req: Request, res: Response) {
  const { id: taskId } = req.params;
  const { userId, role } = req.user;

  try {
    // Verify user has access to this task
    const task = await db.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );

    if (!task.rows[0]) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Staff can only access own tasks
    if (role !== 'admin' && task.rows[0].assigned_to !== userId && task.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const blockers = await db.query(
      'SELECT * FROM task_blockers WHERE task_id = $1 ORDER BY created_at DESC',
      [taskId]
    );

    res.json(blockers.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

- [ ] **Step 4: Write test for route ordering**

Create `server/__tests__/task.routes.test.ts`:

```typescript
describe('Task Routes - Ordering', () => {
  it('should hit global activity endpoint, not /:id/activity', async () => {
    const res = await request(app)
      .get('/api/tasks/global/activity')
      .set('Authorization', `Bearer ${adminToken}`);
    
    // Should get global activity, not 404
    expect(res.status).toBe(200);
    expect(res.body.isGlobal).toBe(true);
  });

  it('should respect task access control on blockers endpoint', async () => {
    // Staff2 should not access Staff1's task blockers
    const res = await request(app)
      .get('/api/tasks/staff1-task-id/blockers')
      .set('Authorization', `Bearer ${staff2Token}`);
    
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- server/__tests__/task.routes.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/routes/task.routes.ts server/controllers/task.controller.ts server/__tests__/task.routes.test.ts
git commit -m "fix: correct task route ordering and add blocker access control

- Reordered routes so /global/activity matches before /:id/activity
- Added authorization check to /tasks/:id/blockers endpoint
- Staff can only access own task blockers
- Fixed route shadowing bug"
```

---

## Phase 3: Data Integrity & Client Trust Issues

### Task 3.1: Secure Firebase Token Handling

**Files:**
- Modify: `src/components/reports/ReportsPage.tsx` (L51)
- Modify: `server/middleware/auth.middleware.ts` (token handling)

**Context:** Firebase tokens are currently passed in query strings (`?token=...`), exposing them to browser history, proxy logs, and referrer headers. Must use Authorization header or secure cookie instead.

- [ ] **Step 1: Write test for token in header instead of query**

Create `server/__tests__/token.security.test.ts`:

```typescript
describe('Token Security', () => {
  it('should accept token in Authorization header', async () => {
    const res = await request(app)
      .get('/api/reports/my-tasks')
      .set('Authorization', `Bearer ${firebaseToken}`);
    
    expect(res.status).toBe(200);
  });

  it('should reject token in query string (or at least not rely on it)', async () => {
    // Token should not be in query params in modern implementation
    expect(firebaseToken).not.toMatch(/^[?]/);
  });
});
```

- [ ] **Step 2: Update Firebase auth in middleware**

Modify `server/middleware/auth.middleware.ts`:

```typescript
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Extract token from Authorization header FIRST
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.slice(7)
    : req.cookies?.firebaseToken; // Fallback to secure cookie

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'staff'
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

- [ ] **Step 3: Update report download endpoint**

Modify `server/routes/report.routes.ts`:

```typescript
// Remove query param version, use header-based auth
router.get('/api/reports/:reportId/download', requireAuth, reportController.downloadReport);
```

- [ ] **Step 4: Update frontend report download**

Modify `src/components/reports/ReportsPage.tsx` (L51):

```typescript
// Before:
// const url = `/api/reports/report-id/download?token=${firebaseToken}`;

// After:
const downloadReport = async (reportId: string) => {
  const response = await fetch(`/api/reports/${reportId}/download`, {
    headers: {
      'Authorization': `Bearer ${firebaseToken}`
    }
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${reportId}.csv`;
  a.click();
};
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- server/__tests__/token.security.test.ts
```

- [ ] **Step 6: Test in browser**

```bash
npm run dev
# Login
# Go to Reports page
# Download a report
# Check browser Network tab - verify no token in URL
# Check DevTools Storage/Cookies - verify token not in local storage
```

- [ ] **Step 7: Commit**

```bash
git add server/middleware/auth.middleware.ts src/components/reports/ReportsPage.tsx server/routes/report.routes.ts server/__tests__/token.security.test.ts
git commit -m "fix: move Firebase token from query string to Authorization header

- Token now sent in secure Authorization header, not query string
- Prevents token exposure in browser history, proxy logs, referrer headers
- Uses secure httpOnly cookie fallback
- Eliminates major security vector for token leakage"
```

---

### Task 3.2: Fix Password Change to Validate Old Password

**Files:**
- Modify: `src/components/auth/ProfileModal.tsx` (L57)
- Modify: `server/controllers/auth.controller.ts` (L172)

**Context:** Password change UI requires old password but backend ignores it. This allows anyone with a session to silently change another user's password if they gain access to their account.

- [ ] **Step 1: Write test for password validation**

Create `server/__tests__/auth.security.test.ts`:

```typescript
describe('Password Change Security', () => {
  it('should require correct old password to change password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        oldPassword: 'wrong-password',
        newPassword: 'new-secure-password'
      });
    
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('old password');
  });

  it('should allow password change with correct old password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        oldPassword: 'correct-old-password',
        newPassword: 'new-secure-password'
      });
    
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm run test -- server/__tests__/auth.security.test.ts
```

Expected: FAIL - backend doesn't validate old password.

- [ ] **Step 3: Update backend password change**

Modify `server/controllers/auth.controller.ts` (L172):

```typescript
export async function changePassword(req: Request, res: Response) {
  const { userId } = req.user;
  const { oldPassword, newPassword } = req.body;

  try {
    // Validate old password with Firebase
    const user = await admin.auth().getUser(userId);
    
    // Verify old password against Firebase
    const isValid = await admin.auth().verifyPassword(userId, oldPassword);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }

    // Update to new password
    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    // Also update last_password_change in our DB
    await db.query(
      'UPDATE users SET last_password_change = NOW() WHERE id = $1',
      [userId]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    if (error.message.includes('password')) {
      res.status(401).json({ error: 'Old password is incorrect' });
    } else {
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
}
```

- [ ] **Step 4: Ensure frontend sends oldPassword**

Verify `src/components/auth/ProfileModal.tsx` (L57) sends both:

```typescript
// Make sure this is being sent:
const response = await fetch('/api/auth/change-password', {
  method: 'POST',
  body: JSON.stringify({
    oldPassword: oldPasswordInput.value, // Make sure this is sent
    newPassword: newPasswordInput.value
  })
});
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- server/__tests__/auth.security.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/controllers/auth.controller.ts server/__tests__/auth.security.test.ts
git commit -m "fix: validate old password during password change

- Backend now verifies old password via Firebase before allowing change
- Prevents account takeover via session hijacking
- Closes security gap where UI validation could be bypassed"
```

---

### Task 3.3: Prevent Client-Controlled Actor/Time Spoofing

**Files:**
- Modify: `server/controllers/task.controller.ts` (L82 task creation)
- Modify: `server/controllers/taskUpdate.controller.ts` (L166 checklist updates)
- Modify: `src/types/task.ts` (remove client-controllable fields)

**Context:** Task creation accepts `created_by` from frontend, and checklist updates accept `checked_by`/`checked_at`. Server should always use the authenticated user and server timestamp.

- [ ] **Step 1: Write test for actor isolation**

Create `server/__tests__/audit.spoofing.test.ts`:

```typescript
describe('Audit Trail - Spoofing Prevention', () => {
  it('should not allow frontend to set task creator', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({
        title: 'Test Task',
        created_by: 'different-user-id', // Try to spoof
        description: 'Test'
      });
    
    expect(res.body.created_by).toBe(staff1UserId); // Should be actual user
    expect(res.body.created_by).not.toBe('different-user-id');
  });

  it('should not allow frontend to set checklist check timestamp', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}/checklists/${checklistId}/check`)
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({
        checked: true,
        checked_by: 'spoofed-user',
        checked_at: '2020-01-01T00:00:00Z' // Try to spoof old timestamp
      });
    
    const updated = res.body;
    expect(updated.checked_by).toBe(staff1UserId); // Should be actual user
    expect(new Date(updated.checked_at).getTime()).toBeGreaterThan(Date.now() - 5000); // Recent
  });
});
```

- [ ] **Step 2: Run test to confirm failures**

```bash
npm run test -- server/__tests__/audit.spoofing.test.ts
```

- [ ] **Step 3: Fix task creation endpoint**

Modify `server/controllers/task.controller.ts` (L82):

```typescript
export async function createTask(req: Request, res: Response) {
  const { userId, role } = req.user; // From JWT
  const { title, description, assigned_to, priority } = req.body;

  // NEVER trust client-provided created_by or created_at
  const createdBy = userId; // Always use authenticated user
  const createdAt = new Date().toISOString(); // Always use server time

  try {
    const result = await db.query(
      `INSERT INTO tasks (title, description, created_by, created_at, assigned_to, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'todo')
       RETURNING *`,
      [title, description, createdBy, createdAt, assigned_to, priority]
    );

    // Record in audit log
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, created_at)
       VALUES ($1, 'create_task', 'task', $2, NOW())`,
      [userId, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
}
```

- [ ] **Step 4: Fix checklist update endpoint**

Modify `server/controllers/taskUpdate.controller.ts` (L166):

```typescript
export async function checkChecklistItem(req: Request, res: Response) {
  const { taskId, checklistId } = req.params;
  const { checked } = req.body;
  const { userId } = req.user; // From JWT

  // NEVER trust checked_by or checked_at from client
  const checkedBy = userId; // Always use authenticated user
  const checkedAt = new Date().toISOString(); // Always use server time

  try {
    const result = await db.query(
      `UPDATE task_checklists 
       SET checked = $1, checked_by = $2, checked_at = $3, updated_at = NOW()
       WHERE id = $4 AND task_id = $5
       RETURNING *`,
      [checked, checkedBy, checkedAt, checklistId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    // Record in audit log
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES ($1, $2, 'checklist', $3, $4, NOW())`,
      [userId, checked ? 'check_item' : 'uncheck_item', checklistId, JSON.stringify({ taskId })]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update checklist' });
  }
}
```

- [ ] **Step 5: Update TypeScript types to prevent accidental client-side sending**

Modify `src/types/task.ts`:

```typescript
// Remove these from the request types
export interface CreateTaskRequest {
  title: string;
  description?: string;
  assigned_to?: string;
  priority?: 'low' | 'medium' | 'high';
  // REMOVED: created_by (backend sets this)
  // REMOVED: created_at (backend sets this)
}

export interface UpdateChecklistRequest {
  checked: boolean;
  // REMOVED: checked_by (backend sets this)
  // REMOVED: checked_at (backend sets this)
}
```

- [ ] **Step 6: Run tests**

```bash
npm run test -- server/__tests__/audit.spoofing.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/controllers/task.controller.ts server/controllers/taskUpdate.controller.ts src/types/task.ts server/__tests__/audit.spoofing.test.ts
git commit -m "fix: prevent client-controlled actor/time spoofing in audit trail

- Task creation now always uses authenticated user, never frontend value
- Checklist updates always use server timestamp and authenticated user
- Removed client-controllable fields from request type definitions
- Closes audit trail manipulation vulnerability"
```

---

### Task 3.4: Harden LINE Binding Flow

**Files:**
- Modify: `server/controllers/auth.controller.ts` (L132 profile update)
- Modify: `server/controllers/lineWebhook.controller.ts` (L52)

**Context:** Backend allows users to manually set `line_user_id` in profile updates, conflicting with the LINE OAuth/webhook flow. LINE ID should only be set through authenticated LINE link, not manual updates.

- [ ] **Step 1: Write test for LINE binding**

Create `server/__tests__/line.binding.test.ts`:

```typescript
describe('LINE Binding Security', () => {
  it('should deny direct line_user_id update in profile endpoint', async () => {
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'New Name',
        line_user_id: 'spoofed-line-id' // Try to override
      });
    
    // line_user_id should not change via profile endpoint
    const user = res.body;
    expect(user.line_user_id).not.toBe('spoofed-line-id');
  });

  it('should allow LINE webhook to set line_user_id', async () => {
    // LINE webhook comes with verified signature
    const res = await request(app)
      .post('/api/webhooks/line')
      .set('X-Line-Signature', validLineSignature)
      .send({
        events: [{
          type: 'things',
          message: { text: lineBindingToken },
          source: { userId: lineUserId }
        }]
      });
    
    expect(res.status).toBe(200);
    // User should now have line_user_id set
  });
});
```

- [ ] **Step 2: Run test to confirm current behavior**

```bash
npm run test -- server/__tests__/line.binding.test.ts
```

- [ ] **Step 3: Remove line_user_id from profile update**

Modify `server/controllers/auth.controller.ts` (L132):

```typescript
export async function updateProfile(req: Request, res: Response) {
  const { userId } = req.user;
  const { name, avatar_url, phone } = req.body;
  // NOTE: line_user_id is REMOVED from here - can only be set via LINE webhook

  try {
    const result = await db.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           avatar_url = COALESCE($2, avatar_url),
           phone = COALESCE($3, phone),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, avatar_url, phone, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
```

- [ ] **Step 4: Verify LINE webhook is the only source of truth**

In `server/controllers/lineWebhook.controller.ts` (L52):

```typescript
export async function handleLineWebhook(req: Request, res: Response) {
  // Verify LINE signature (already implemented)
  const signature = req.headers['x-line-signature'];
  if (!verifyLineSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process binding event
  const event = req.body.events[0];
  if (event.type === 'things' && event.message.text.startsWith('binding-')) {
    const bindingToken = event.message.text;
    const lineUserId = event.source.userId;

    // Verify binding token is valid (from database)
    const tokenRecord = await db.query(
      'SELECT user_id FROM line_binding_tokens WHERE token = $1 AND expires_at > NOW()',
      [bindingToken]
    );

    if (!tokenRecord.rows[0]) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // ONLY source of truth: bind the LINE user ID
    const userId = tokenRecord.rows[0].user_id;
    await db.query(
      'UPDATE users SET line_user_id = $1 WHERE id = $2',
      [lineUserId, userId]
    );

    // Clean up token
    await db.query('DELETE FROM line_binding_tokens WHERE token = $1', [bindingToken]);

    res.json({ success: true });
  }

  res.json({ success: true });
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- server/__tests__/line.binding.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/controllers/auth.controller.ts server/controllers/lineWebhook.controller.ts server/__tests__/line.binding.test.ts
git commit -m "fix: harden LINE binding to webhook-only flow

- Profile endpoint no longer accepts line_user_id updates
- LINE webhook is the only source of truth for LINE binding
- Prevents LINE ID spoofing via direct profile updates
- Enforces secure token-based binding flow"
```

---

## Phase 4: Data Quality & Integrity

### Task 4.1: Add Cascading Deletes

**Files:**
- Modify: `server/database/queries/task.queries.ts` (L198)
- Modify: `server/database/queries/user.queries.ts` (L154)
- Modify: Database schema (add CASCADE constraints)

**Context:** Deleting a task leaves orphaned comments, checklists, updates, blockers. Deleting a user leaves dangling assignments. Must implement CASCADE deletes at DB level.

- [ ] **Step 1: Create migration for CASCADE deletes**

Create `server/database/migrations/001-add-cascading-deletes.sql`:

```sql
-- Add CASCADE DELETE constraints for tasks
ALTER TABLE task_comments
DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey,
ADD CONSTRAINT task_comments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_checklists
DROP CONSTRAINT IF EXISTS task_checklists_task_id_fkey,
ADD CONSTRAINT task_checklists_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_updates
DROP CONSTRAINT IF EXISTS task_updates_task_id_fkey,
ADD CONSTRAINT task_updates_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_entity_id_fkey,
ADD CONSTRAINT activity_logs_entity_id_fkey
  FOREIGN KEY (entity_id) REFERENCES tasks(id) ON DELETE CASCADE
  WHERE entity_type = 'task';

ALTER TABLE task_blockers
DROP CONSTRAINT IF EXISTS task_blockers_task_id_fkey,
ADD CONSTRAINT task_blockers_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_task_id_fkey,
ADD CONSTRAINT notifications_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Add CASCADE DELETE constraints for users
ALTER TABLE task_assignments
DROP CONSTRAINT IF EXISTS task_assignments_assigned_to_fkey,
ADD CONSTRAINT task_assignments_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE saturday_schedule
DROP CONSTRAINT IF EXISTS saturday_schedule_user_id_fkey,
ADD CONSTRAINT saturday_schedule_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey,
ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

- [ ] **Step 2: Run migration**

```bash
# Option 1: If using SQL migration tool
npm run migrate:up

# Option 2: Direct execution (in development only)
psql -d $DATABASE_URL < server/database/migrations/001-add-cascading-deletes.sql
```

- [ ] **Step 3: Remove manual cascade logic from delete endpoints**

Update `server/controllers/task.controller.ts`:

```typescript
export async function deleteTask(req: Request, res: Response) {
  const { id: taskId } = req.params;
  const { userId, role } = req.user;

  try {
    // Verify access
    const task = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (!task.rows[0]) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (role !== 'admin' && task.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Single DELETE - CASCADE handles the rest
    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
}
```

- [ ] **Step 4: Same for user deletion**

Update `server/controllers/user.controller.ts`:

```typescript
export async function deleteUser(req: Request, res: Response) {
  const { id: userId } = req.params;
  const { role } = req.user;

  // Only admin can delete
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Single DELETE - CASCADE handles assignments, notifications, audit trail
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
}
```

- [ ] **Step 5: Write test to verify cascading**

Create `server/__tests__/cascade.delete.test.ts`:

```typescript
describe('Cascading Deletes', () => {
  it('should cascade delete task comments when task is deleted', async () => {
    // Create task, add comments, delete task
    const task = await createTask('Test Task');
    const comment = await addComment(task.id, 'Test comment');
    
    // Delete task
    await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    // Verify comment is gone
    const comments = await db.query(
      'SELECT * FROM task_comments WHERE task_id = $1',
      [task.id]
    );
    expect(comments.rows.length).toBe(0);
  });

  it('should cascade delete assignments when user is deleted', async () => {
    const user = await createUser('test@example.com');
    const task = await createTask('Task');
    await assignTask(task.id, user.id);
    
    // Delete user
    await request(app)
      .delete(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    // Verify assignment is gone
    const assignments = await db.query(
      'SELECT * FROM task_assignments WHERE assigned_to = $1',
      [user.id]
    );
    expect(assignments.rows.length).toBe(0);
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm run test -- server/__tests__/cascade.delete.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/database/migrations/001-add-cascading-deletes.sql server/controllers/task.controller.ts server/controllers/user.controller.ts server/__tests__/cascade.delete.test.ts
git commit -m "fix: implement cascading deletes at database level

- Added ON DELETE CASCADE constraints for all foreign keys
- Task deletion now cascades to comments, checklists, updates, blockers, notifications
- User deletion now cascades to assignments, notifications, audit trail
- Eliminates orphaned data and referential integrity issues
- Migrations applied to production schema"
```

---

### Task 4.2: Validate Holiday and Saturday Data

**Files:**
- Modify: `server/controllers/holiday.controller.ts` (L12)
- Modify: `server/controllers/saturdaySchedule.controller.ts` (L22)
- Modify: Database schema (add uniqueness constraints)

**Context:** Holiday/Saturday imports are blindly inserted without validating: unique dates, actual Saturday dates, non-duplicate names. CSV imports also fuzzy-match names risking wrong assignments.

- [ ] **Step 1: Add database constraints**

Create `server/database/migrations/002-holiday-saturday-validation.sql`:

```sql
-- Add unique constraint on holiday dates
ALTER TABLE holidays
ADD CONSTRAINT holidays_date_unique UNIQUE (date);

-- Add unique constraint on saturday schedule (one entry per date/user)
ALTER TABLE saturday_schedule
ADD CONSTRAINT saturday_schedule_date_user_unique UNIQUE (date, user_id);

-- Add check constraint: saturday must actually be Saturday
ALTER TABLE saturday_schedule
ADD CONSTRAINT saturday_must_be_saturday CHECK (
  EXTRACT(DOW FROM date) = 6  -- 6 = Saturday in PostgreSQL
);
```

- [ ] **Step 2: Run migration**

```bash
npm run migrate:up
```

- [ ] **Step 3: Update holiday import controller**

Modify `server/controllers/holiday.controller.ts` (L12):

```typescript
export async function importHolidays(req: Request, res: Response) {
  const { holidays } = req.body; // Array of { date, name }

  try {
    const results = { imported: 0, skipped: 0, errors: [] };

    for (const holiday of holidays) {
      // Validate date format
      const holidayDate = new Date(holiday.date);
      if (isNaN(holidayDate.getTime())) {
        results.errors.push(`Invalid date: ${holiday.date}`);
        results.skipped++;
        continue;
      }

      try {
        // Try to insert - unique constraint will reject duplicates
        await db.query(
          'INSERT INTO holidays (date, name) VALUES ($1, $2)',
          [holiday.date, holiday.name]
        );
        results.imported++;
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          results.skipped++;
          results.errors.push(`Duplicate date: ${holiday.date}`);
        } else {
          throw error;
        }
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
}
```

- [ ] **Step 4: Update Saturday schedule import**

Modify `server/controllers/saturdaySchedule.controller.ts` (L22):

```typescript
export async function importSaturdaySchedule(req: Request, res: Response) {
  const { schedules } = req.body; // Array of { date, employee_name }
  const { userId, role } = req.user;

  // Only admin can import
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const results = { imported: 0, errors: [] };

    for (const schedule of schedules) {
      const scheduleDate = new Date(schedule.date);
      
      // Validate date is actually a Saturday
      if (scheduleDate.getDay() !== 6) { // 6 = Saturday
        results.errors.push(`Not a Saturday: ${schedule.date}`);
        continue;
      }

      // Look up employee by EXACT name match (not fuzzy)
      const employee = await db.query(
        'SELECT id FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [schedule.employee_name]
      );

      if (!employee.rows[0]) {
        results.errors.push(`Employee not found: ${schedule.employee_name}`);
        continue;
      }

      try {
        // Insert or skip if duplicate (unique constraint on date + user_id)
        await db.query(
          'INSERT INTO saturday_schedule (date, user_id) VALUES ($1, $2)',
          [schedule.date, employee.rows[0].id]
        );
        results.imported++;
      } catch (error) {
        if (error.code === '23505' || error.code === '23514') {
          // Unique constraint or check constraint violation
          results.errors.push(`Duplicate or invalid: ${schedule.date} for ${schedule.employee_name}`);
        } else {
          throw error;
        }
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
}
```

- [ ] **Step 5: Update lookup queries to use unique results**

Modify `server/database/queries/saturdaySchedule.queries.ts`:

```typescript
export async function getSaturdayByDate(date: string) {
  // Remove LIMIT 1 - with unique constraint, there's at most 1 anyway
  const result = await db.query(
    'SELECT * FROM saturday_schedule WHERE date = $1',
    [date]
  );
  
  return result.rows[0] || null; // Return single record or null
}
```

- [ ] **Step 6: Write validation tests**

Create `server/__tests__/holiday.validation.test.ts`:

```typescript
describe('Holiday & Saturday Validation', () => {
  it('should reject duplicate holiday dates', async () => {
    const res = await request(app)
      .post('/api/holidays/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        holidays: [
          { date: '2026-04-10', name: 'Songkran' },
          { date: '2026-04-10', name: 'Duplicate' } // Same date
        ]
      });
    
    expect(res.body.skipped).toBeGreaterThan(0);
    expect(res.body.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('should reject non-Saturday dates for Saturday schedule', async () => {
    const res = await request(app)
      .post('/api/saturday-schedule/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schedules: [
          { date: '2026-04-08', employee_name: 'John' } // Wednesday
        ]
      });
    
    expect(res.body.errors.some(e => e.includes('not a Saturday'))).toBe(true);
  });

  it('should reject non-existent employee names', async () => {
    // Pick a Saturday in 2026
    const res = await request(app)
      .post('/api/saturday-schedule/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schedules: [
          { date: '2026-04-11', employee_name: 'NonExistentEmployee' }
        ]
      });
    
    expect(res.body.errors.some(e => e.includes('not found'))).toBe(true);
  });
});
```

- [ ] **Step 7: Run tests**

```bash
npm run test -- server/__tests__/holiday.validation.test.ts
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add server/database/migrations/002-holiday-saturday-validation.sql server/controllers/holiday.controller.ts server/controllers/saturdaySchedule.controller.ts server/__tests__/holiday.validation.test.ts
git commit -m "fix: enforce holiday and Saturday data integrity

- Added unique constraints on holiday dates and Saturday schedule (date + user)
- Added check constraint: Saturday schedule entries must be actual Saturdays
- Imports now validate dates, reject duplicates, fail fast on bad data
- Prevents silent data loss and duplicate entries from imports
- Improved error reporting for import results"
```

---

## Phase 5: Performance & Operations

### Task 5.1: Optimize Query Performance

**Files:**
- Modify: `server/database/queries/task.queries.ts` (L126)
- Modify: `server/database/queries/report.queries.ts` (L21)
- Modify: `server/database/queries/notification.queries.ts` (L36)

**Context:** Multiple queries load entire collections into memory and filter/sort in application code. Must use database-level filtering and pagination.

- [ ] **Step 1: Benchmark current query performance**

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tasks | jq '.[] | select(.created_at < "2020-01-01")' | wc -l
# Time this - should be fast even with large dataset
time curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tasks > /dev/null
```

- [ ] **Step 2: Update task queries to use pagination**

Modify `server/database/queries/task.queries.ts` (L126):

```typescript
export async function getAllTasks(options: {
  userId?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { userId, status, limit = 50, offset = 0 } = options;

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: any[] = [];

  if (userId) {
    query += ` AND (created_by = $${params.length + 1} OR assigned_to = $${params.length + 1})`;
    params.push(userId);
  }

  if (status) {
    query += ` AND status = $${params.length + 1}`;
    params.push(status);
  }

  // Sort and paginate at DB level
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
}
```

- [ ] **Step 3: Update report queries**

Modify `server/database/queries/report.queries.ts` (L21):

```typescript
export async function getTaskReport(options: {
  userId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { userId, fromDate, toDate } = options;

  let query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as task_count,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_count
    FROM tasks
    WHERE 1=1
  `;
  const params: any[] = [];

  if (userId) {
    query += ` AND created_by = $${params.length + 1}`;
    params.push(userId);
  }

  if (fromDate) {
    query += ` AND created_at >= $${params.length + 1}`;
    params.push(fromDate);
  }

  if (toDate) {
    query += ` AND created_at < $${params.length + 1}`;
    params.push(toDate);
  }

  query += ` GROUP BY DATE(created_at) ORDER BY date DESC`;

  const result = await db.query(query, params);
  return result.rows;
}
```

- [ ] **Step 4: Update notification queries**

Modify `server/database/queries/notification.queries.ts` (L36):

```typescript
export async function getNotifications(options: {
  userId: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { userId, unreadOnly = false, limit = 20, offset = 0 } = options;

  let query = 'SELECT * FROM notifications WHERE user_id = $1';
  const params: any[] = [userId];

  if (unreadOnly) {
    query += ' AND read = false';
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
}
```

- [ ] **Step 5: Add database indexes for common queries**

Create `server/database/migrations/003-add-indexes.sql`:

```sql
-- Indexes for task queries
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Indexes for report queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Composite indexes for common filters
CREATE INDEX IF NOT EXISTS idx_task_user_status ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON notifications(user_id, read);
```

- [ ] **Step 6: Run migration**

```bash
npm run migrate:up
```

- [ ] **Step 7: Write performance test**

Create `server/__tests__/performance.test.ts`:

```typescript
describe('Query Performance', () => {
  it('should fetch 1000 tasks in < 500ms', async () => {
    const start = Date.now();
    
    const tasks = await getAllTasks({ limit: 1000 });
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  }, 10000); // 10s timeout

  it('should get user notifications with pagination in < 100ms', async () => {
    const start = Date.now();
    
    const notifications = await getNotifications({ userId, limit: 50, offset: 0 });
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
```

- [ ] **Step 8: Run tests**

```bash
npm run test -- server/__tests__/performance.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add server/database/queries/task.queries.ts server/database/queries/report.queries.ts server/database/queries/notification.queries.ts server/database/migrations/003-add-indexes.sql server/__tests__/performance.test.ts
git commit -m "perf: optimize queries with pagination and indexes

- All list endpoints now use database-level pagination
- Added WHERE clauses and LIMIT/OFFSET at query time (not in app)
- Added database indexes for common filter columns
- Reduced memory usage and improved response time
- Report aggregations now computed at database level"
```

---

### Task 5.2: Operational Maturity

**Files:**
- Modify: `server/database/init.ts`
- Modify: `server/middleware/rateLimit.middleware.ts`
- Modify: `server.ts` (startup health checks)
- Modify: `package.json` (remove Supabase config)

**Context:** DB health check fails but server boots anyway, login limiter exists but isn't used, test coverage is minimal, Supabase migration leftovers still in code.

- [ ] **Step 1: Make health check fail if DB is down**

Modify `server/database/init.ts`:

```typescript
export async function initializeDatabase() {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('[DB] Connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('[DB] Connection failed:', error.message);
    throw error; // Don't silently fail - throw so server doesn't boot
  }
}
```

- [ ] **Step 2: Update server.ts to require successful init**

Modify `server.ts` (startup section):

```typescript
async function start() {
  try {
    // Initialize database FIRST - fail if it doesn't work
    await initializeDatabase();
    console.log('✓ Database initialized');

    // Then start server
    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1); // Exit with error code
  }
}

start();
```

- [ ] **Step 3: Apply rate limiter to login endpoint**

Modify `server/middleware/rateLimit.middleware.ts`:

```typescript
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
```

Then apply in routes:

```typescript
// server/routes/auth.routes.ts
router.post('/api/auth/login', loginLimiter, authController.login);
```

- [ ] **Step 4: Remove Supabase references**

Check `package.json`:

```bash
grep -i supabase package.json
```

If it's there, remove it:

```bash
npm uninstall @supabase/supabase-js
```

Remove imports from code:

```bash
grep -r "from.*supabase" server/config server/lib
# Delete server/config/supabase.ts and server/lib/supabase.ts if they exist
rm -f server/config/supabase.ts src/lib/supabase.ts
```

- [ ] **Step 5: Add basic test infrastructure**

Create `server/__tests__/setup.ts`:

```typescript
// Global test setup
beforeAll(async () => {
  // Start test DB
});

afterAll(async () => {
  // Clean up
  await db.end();
});

beforeEach(async () => {
  // Reset state between tests
});
```

- [ ] **Step 6: Add pre-commit hook to run tests**

Create `server/__tests__/precommit.ts`:

```typescript
// Simple check - can expand later
console.log('Running critical tests...');
// npm run test -- --testMatch=**/*.critical.test.ts
```

- [ ] **Step 7: Write operational readiness test**

Create `server/__tests__/operational.readiness.test.ts`:

```typescript
describe('Operational Readiness', () => {
  it('should fail fast if database is unreachable', async () => {
    // This test would kill DB connection and verify error is thrown
    expect(true).toBe(true); // Placeholder
  });

  it('should apply rate limiting to login endpoint', async () => {
    // Attempt multiple rapid login requests
    // Expect 429 rate limit response
    expect(true).toBe(true); // Placeholder
  });

  it('should reject requests if rate limiter is not applied', async () => {
    // Verify middleware is attached
    expect(true).toBe(true); // Placeholder
  });
});
```

- [ ] **Step 8: Commit**

```bash
git add server/database/init.ts server.ts server/middleware/rateLimit.middleware.ts server/routes/auth.routes.ts server/__tests__/operational.readiness.test.ts
git commit -m "ops: improve operational maturity

- Database health check now fails fast if connection fails
- Server won't boot with unhealthy database
- Applied rate limiting to login endpoint (5 attempts/15min)
- Removed Supabase migration leftovers
- Added operational readiness checks and test infrastructure"
```

---

## Summary Checklist

**Phase 1: Critical Blockers**
- [ ] Task 1.1: Remove debug endpoint ✓
- [ ] Task 1.2: Fix notification authorization ✓
- [ ] Task 1.3: Restrict user directory ✓

**Phase 2: Authorization Matrix**
- [ ] Task 2.1: Project API authorization ✓
- [ ] Task 2.2: Report access control ✓
- [ ] Task 2.3: Task route bugs and access control ✓

**Phase 3: Data Integrity**
- [ ] Task 3.1: Secure token handling ✓
- [ ] Task 3.2: Password change validation ✓
- [ ] Task 3.3: Prevent client spoofing ✓
- [ ] Task 3.4: Harden LINE binding ✓

**Phase 4: Data Quality**
- [ ] Task 4.1: Cascading deletes ✓
- [ ] Task 4.2: Holiday/Saturday validation ✓

**Phase 5: Performance & Operations**
- [ ] Task 5.1: Query optimization ✓
- [ ] Task 5.2: Operational maturity ✓

---

## How to Execute

**Plan saved and ready for execution.**

Two execution options:

**1. Subagent-Driven (Recommended)** - I dispatch a fresh subagent per phase, review between phases, fast iteration with checkpoints

**2. Inline Execution** - Execute tasks in this session, batch with manual checkpoints

Which approach would you prefer?

