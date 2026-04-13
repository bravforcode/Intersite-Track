# Quick-Start Implementation Checklist

## 🔥 CRITICAL: Do These Now (30 mins)

### Install Dependencies
```bash
cd backend
npm install zod  # For API validation
npm install --save-dev @playwright/test  # For E2E testing
cd ../frontend
npm install
```

### Update Frontend Components (Add test-ids)
These are needed for Playwright E2E tests to find elements:

```tsx
// src/App.tsx
<button data-testid="create-task-btn">Create Task</button>

// src/components/auth/LoginForm.tsx
<input data-testid="login-error" visible={hasError}/>
<button data-testid="user-menu">Profile Menu</button>
<button data-testid="logout-btn">Logout</button>

// src/components/TaskCard.tsx
<div data-testid="task-card">...</div>
<button data-testid="edit-task-btn">Edit</button>
<button data-testid="start-timer-btn">Start</button>
<button data-testid="stop-timer-btn">Stop</button>
<button data-testid="time-entries-list">Entries</button>

// src/components/FileUpload.tsx
<form data-testid="file-upload-section">...</form>
<button data-testid="assign-users-btn">Assign</button>

// Update task upload frontend to use new download API
// OLD:  url: blob.url (public blob)
// NEW:  download_url: `/api/files/${metadata.id}/download` (secure)
```

### Test Your Changes
```bash
# Build both frontend and backend
npm run build       # Frontend
npm run build:be    # Backend

# Run linting
npm run lint

# Run unit tests
npm test

# Run E2E tests (will start dev server)
npx playwright test tests/e2e/auth.spec.ts
npx playwright test tests/e2e/tasks.spec.ts
```

---

## ② HIGH PRIORITY (2-3 hours)

### 1. Implement Zod Validation Schemas
```bash
# After npm install zod, uncomment schemas in shared/schemas/api.schemas.ts
# Then create a validation middleware:
```

**File**: `backend/src/middleware/validate.middleware.ts`
```typescript
import { z } from "zod";
import { ApiError } from "../utils/apiResponse";

export function validateBody(schema: z.ZodSchema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce((acc, e) => {
          acc[e.path.join(".")] = e.message;
          return acc;
        }, {} as Record<string, string>);
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid request", details);
      }
      next(error);
    }
  };
}
```

### 2. Apply to Key Routes
```typescript
// backend/src/routes/task.routes.ts
import { validateBody } from "../middleware/validate.middleware.js";
import { CreateTaskSchema } from "@shared/schemas/api.schemas.js";

router.post("/", requireAuth, validateBody(CreateTaskSchema), createTask);
```

### 3. Add Frontend Test Accounts Setup
**File**: `backend/scripts/setup-test-accounts.ts`
```typescript
// Creates consistent test accounts for E2E tests
// Run: npx ts-node scripts/setup-test-accounts.ts
```

---

## ③ PERFORMANCE CRITICAL (4-5 hours)

### Optimize Firestore Queries
Update `backend/src/database/queries/*.ts` using patterns from FIRESTORE-OPTIMIZATION-GUIDE.md

**Priority order**:
1. task.queries.ts - Most queries here
2. project.queries.ts - Heavy filtering
3. report.queries.ts - Loads all data
4. user.queries.ts - N+1 problem

Example refactor:
```typescript
// BEFORE (bad)
async function getAllTasks() {
  const snap = await db.collection("tasks").get();
  return snap.docs.map(d => d.data());
}

// AFTER (good)
async function getTasksByProject(projectId: string, limit = 20, offset = 0) {
  const query = db.collection("tasks")
    .where("project_id", "==", projectId)
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset(offset);
  
  const snap = await query.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
```

### Deploy Firestore Indexes
```bash
# Update firestore.indexes.json with all composite indexes
# Deploy them
firebase deploy --only firestore:indexes

# Wait for indexes to build (watch Firebase console)
```

---

## ④ ACCESSIBILITY FIXES (1-2 hours)

### Update Modal Component
**File**: `frontend/src/components/Modal.tsx`

```tsx
function Modal({ isOpen, onClose, children, title }) {
  return (
    <div
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <h2 id="modal-title">{title}</h2>
        <button aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
```

### Add ARIA Labels
- Every form input needs `aria-label` or associated `<label>`
- Every button needs descriptive text or `aria-label`
- Every interactive section needs proper ARIA roles

---

## ⑤ INTEGRATION TESTS (2-3 hours)

### Firestore Integration Tests
**File**: `tests/integration/firestore.spec.ts`
```typescript
import { describe, it } from "node:test";
import { db } from "backend/src/database/connection.js";

describe("Firestore Operations", () => {
  it("should create and retrieve task", async () => {
    const docRef = await db.collection("tasks").add({
      title: "Test",
      project_id: "proj-1",
    });
    
    const doc = await docRef.get();
    assert(doc.exists);
  });
});
```

### Time Entry Authorization Tests
```typescript
// Verify:
// - User can only see their own time entries
// - Staff can't access entries from other tasks
// - Admin can access all entries
```

---

## ✅ BEFORE DEPLOYING TO PRODUCTION

1. Run full test suite:
   ```bash
   npm run build
   npm run lint
   npm test
   npx playwright test
   ```

2. Deploy to staging and verify:
   - File upload/download works
   - Authentication works
   - Time tracking works
   - All API responses have correct format

3. Performance testing:
   ```bash
   npm run k6:load -- realistic-load.js
   npm run k6:spike -- spike-test.js
   ```

4. Accessibility audit:
   ```bash
   npx lighthouse https://staging-url --output=json
   ```

---

## EXPECTED SCORE AFTER COMPLETING ALL ABOVE

| Phase | Tasks | Score | Points |
|-------|-------|-------|--------|
| Current | - | 55/100 | - |
| Phase 1-3 (DONE) | Deploy, Security, E2E | 68-72/100 | +17 |
| Phase 4 (TODO) | Validation, Optimization | 80-85/100 | +12 |
| Phase 5 (TODO) | Accessibility, Integration | 90-95/100 | +10 |
| Phase 6 (TODO) | Docs, Logging | 98-100/100 | +5 |

**Timeline**: 1-2 days with focused effort

---

## Common Issues & Fixes

### Issue: Playwright tests timeout
```bash
# Fix: Ensure dev server is running
npm run dev &
npx playwright test --debug
```

### Issue: Zod validation errors not showing
```bash
# Fix: Check that validateBody middleware is wired in errorHandler
app.use(errorHandler); // Must come LAST
```

### Issue: File download returns blob URL instead of signed URL
```
Fix: Update frontend upload handler to use download_url from response
NOT blob_url - that's for direct viewing only now
```

### Issue: Firestore indexes not deployed
```bash
# Fix: Deploy manually
firebase deploy --only firestore:indexes --force
# Monitor in Firebase console until status is "Enabled"
```

