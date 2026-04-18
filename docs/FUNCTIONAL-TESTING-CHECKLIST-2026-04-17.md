# Functional Testing Complete Checklist — 2026-04-17
**Version:** 1.0 | **Status:** Ready for Execution

---

## Module-by-Module Functional Testing

### 1. Authentication Module

#### User Registration
- [ ] User can access registration page
- [ ] Email field validates email format
- [ ] Password field requires minimum 8 characters
- [ ] Password must contain uppercase, lowercase, number, special character
- [ ] Password confirmation must match
- [ ] Display name is required and shows error if empty
- [ ] "Terms of Service" checkbox is required
- [ ] After registration, user redirects to login page
- [ ] Confirmation email is sent
- [ ] User cannot register with existing email (error shown)
- [ ] Rate limiting prevents spam registrations
- [ ] CSRF token is validated on submission
- [ ] Form clears on successful submission
- [ ] Loading state shows during submission
- [ ] Error messages are clear and actionable

#### User Login
- [ ] User can access login page
- [ ] Email field accepts valid email format
- [ ] Password field accepts input
- [ ] "Remember Me" checkbox works (sets persistent session)
- [ ] After successful login, redirects to dashboard
- [ ] Invalid credentials show error message
- [ ] Too many failed attempts lock account temporarily
- [ ] "Forgot Password" link takes to password reset
- [ ] JWT token is issued and stored securely
- [ ] Token includes expiration (15 minutes for access token)
- [ ] Form clears upon successful login
- [ ] OAuth/Social login works (if enabled)
- [ ] Session remains active across page refreshes
- [ ] Logout clears session immediately
- [ ] Cannot access protected routes without valid token

#### Logout
- [ ] Logout button visible in user menu
- [ ] Clicking logout clears session
- [ ] User is redirected to login page
- [ ] Tokens are revoked on backend
- [ ] User cannot use old token to access protected routes
- [ ] "Are you sure?" confirmation shows (if required)
- [ ] Logout works from any page
- [ ] Session timeout automatically logs user out

#### Password Management
- [ ] User can request password reset
- [ ] Reset link sent to email
- [ ] Reset link expires after 1 hour
- [ ] Expired link shows error
- [ ] New password must meet complexity requirements
- [ ] Password confirmation must match
- [ ] After reset, user can login with new password
- [ ] Old password no longer works
- [ ] Multiple simultaneous reset attempts are prevented
- [ ] Reset link cannot be reused

#### Two-Factor Authentication (if enabled)
- [ ] User can enable 2FA
- [ ] QR code for authenticator app is displayed
- [ ] Backup codes are generated and can be saved
- [ ] 2FA can be disabled by user
- [ ] TOTP codes expire after 30 seconds
- [ ] Invalid TOTP code shows error
- [ ] Backup codes work as fallback
- [ ] Each backup code can only be used once

### 2. User Profile Module

#### Profile View
- [ ] User can access their profile
- [ ] All profile information displays correctly
- [ ] Avatar/profile picture shows
- [ ] Display name shows
- [ ] Email shows (masked option)
- [ ] Phone number shows (masked option)
- [ ] Bio/description displays
- [ ] Account creation date shows
- [ ] Last login date shows

#### Profile Edit
- [ ] User can click Edit button
- [ ] All fields become editable
- [ ] Can update display name
- [ ] Can update phone number
- [ ] Can update bio/description
- [ ] Can upload new profile picture
- [ ] Image upload validates file type (jpg, png, webp)
- [ ] Image size is limited to 5MB
- [ ] Image is compressed/resized appropriately
- [ ] Changes are saved successfully
- [ ] Confirmation message shows
- [ ] If validation fails, errors show for invalid fields
- [ ] Original image remains if upload fails
- [ ] Cancel button discards changes

#### Account Settings
- [ ] User can change password
- [ ] Current password must be verified
- [ ] New password meets complexity requirements
- [ ] Email preferences can be updated
- [ ] Notification settings can be toggled
- [ ] Privacy settings can be adjusted
- [ ] Language preference can be changed
- [ ] Timezone can be selected
- [ ] Settings are saved on submission
- [ ] Confirmation message shows

#### Account Deletion
- [ ] Delete account option visible in settings
- [ ] Confirmation dialog appears with warning
- [ ] Requires password re-entry
- [ ] Shows message of data that will be deleted
- [ ] Cannot undo deletion (or provide download first)
- [ ] After deletion, account cannot be recovered
- [ ] User cannot login with deleted account

### 3. Dashboard Module

#### Dashboard View
- [ ] Dashboard loads successfully
- [ ] Welcome message displays with user name
- [ ] Recent tasks show (if any)
- [ ] Statistics/dashboard widgets display
- [ ] Charts/graphs render correctly
- [ ] Filters work correctly
- [ ] Sort options work correctly
- [ ] Pagination works (if needed)
- [ ] Search function filters results
- [ ] Sidebar navigation works
- [ ] Quick action buttons are accessible
- [ ] No layout shift after loading
- [ ] Loading state shows while data fetches

#### Dashboard Interactions
- [ ] Can create new task from dashboard
- [ ] Can edit task from dashboard
- [ ] Can delete task from dashboard
- [ ] Can mark task as complete
- [ ] Task status updates are reflected immediately
- [ ] Filters update results in real-time
- [ ] Deep links work (can share dashboard URL)
- [ ] Dashboard state persists on page refresh

### 4. Task Management Module

#### Task Creation
- [ ] User can access create task form
- [ ] Title field is required
- [ ] Title field shows error if empty
- [ ] Description field is optional
- [ ] Priority can be selected (High, Medium, Low)
- [ ] Due date can be selected
- [ ] Due date must be in future (if enforced)
- [ ] Category/tags can be assigned
- [ ] Assignee can be selected
- [ ] Form validation works before submission
- [ ] Task is created on successful submission
- [ ] Success message shows
- [ ] New task appears in list immediately
- [ ] Form clears after submission
- [ ] Can cancel task creation
- [ ] Date picker works correctly

#### Task Read/View
- [ ] Task details page loads
- [ ] All task information displays
- [ ] Task title, description, status visible
- [ ] Priority badge shows with correct color
- [ ] Due date shows (with days remaining/overdue indicator)
- [ ] Assignee shows
- [ ] Created date shows
- [ ] Last modified date shows
- [ ] Task history/comments show
- [ ] Can view related tasks
- [ ] Activity log shows task modifications
- [ ] Attachments display (if any)
- [ ] Back button returns to task list

#### Task Update
- [ ] User can edit task details
- [ ] Title can be updated
- [ ] Description can be updated
- [ ] Status can be changed
- [ ] Priority can be changed
- [ ] Due date can be modified
- [ ] Assignee can be changed
- [ ] Changes are saved on submit
- [ ] Confirmation message shows
- [ ] Activity log records changes
- [ ] Other users see updated information (if shared)
- [ ] Cancel discards changes
- [ ] Concurrent edit handling (if multiple users)

#### Task Delete
- [ ] Delete option available
- [ ] Confirmation dialog appears
- [ ] Confirmation dialog explains consequences
- [ ] Can cancel deletion
- [ ] After deletion, task removed from list
- [ ] Deleted task cannot be accessed
- [ ] Soft-delete stores data (if applicable)
- [ ] Hard-delete removes permanently (if applicable)
- [ ] User with permission can delete others' tasks
- [ ] Non-owner cannot delete task (permission denied)

#### Task Listing
- [ ] All tasks display in list/table
- [ ] List shows pagination (if > 20 items)
- [ ] Can sort by title, date, priority, status
- [ ] Can filter by status (Open, In Progress, Done)
- [ ] Can filter by priority
- [ ] Can filter by assignee
- [ ] Can filter by date range
- [ ] Search box filters results
- [ ] Search works on title and description
- [ ] List updates when filters change
- [ ] Empty state shows helpful message
- [ ] Loading state shows while fetching

### 5. Notification Module

#### Notification Display
- [ ] Notification center is accessible
- [ ] Unread notification count shows badge
- [ ] Notifications list displays
- [ ] Notification content shows clearly
- [ ] Notifications sorted by most recent
- [ ] Notification types show with icons
- [ ] Notification date/time shows
- [ ] Can mark notification as read
- [ ] Can mark all as read
- [ ] Can delete notification
- [ ] Can delete all notifications
- [ ] Pagination works if many notifications

#### Notification Types
- [ ] Task assignment notification works
- [ ] Task update notification works
- [ ] Comment notification works
- [ ] Mention notification works
- [ ] System notification works
- [ ] Each notification type has appropriate icon
- [ ] Notification content is relevant
- [ ] Clicking notification takes to relevant page
- [ ] Notification clears after action taken (if configured)

#### Line Notification Integration
- [ ] LINE message sends to subscribed users
- [ ] User can subscribe to notifications
- [ ] User can unsubscribe from notifications
- [ ] LINE notification webhook receives messages
- [ ] Messages are formatted properly
- [ ] Webhook signature is validated
- [ ] Failed webhook calls are logged
- [ ] Webhook retry logic works

### 6. File Upload & Storage

#### File Upload
- [ ] File upload input available
- [ ] Can select file from device
- [ ] File type validation works
- [ ] File size validation works (max 50MB)
- [ ] Upload progress bar shows
- [ ] Can cancel upload mid-process
- [ ] Upload error shows if file invalid
- [ ] Success message shows after upload
- [ ] Uploaded file appears in list
- [ ] Multiple files can be uploaded
- [ ] Drag-and-drop upload works (if enabled)

#### File Management
- [ ] Files display in file manager
- [ ] File list shows file name, size, upload date
- [ ] Can preview file (for images, PDFs)
- [ ] Can download file
- [ ] Can rename file
- [ ] Can delete file
- [ ] Confirmation shows before delete
- [ ] File storage space usage shows
- [ ] Can organize in folders/categories
- [ ] File sharing can be managed
- [ ] File permissions can be set

#### File Permissions
- [ ] Owner can download file
- [ ] Owner can share file
- [ ] Owner can delete file
- [ ] Shared users can download (if allowed)
- [ ] Non-shared users cannot access
- [ ] Public/private toggle works
- [ ] Expiration date can be set for shares
- [ ] Download password can be set
- [ ] Permission errors show clearly

### 7. Search & Filter

#### Global Search
- [ ] Search box visible and accessible
- [ ] Can type search query
- [ ] Results appear in real-time
- [ ] Results show across all modules (tasks, notes, files)
- [ ] Search is case-insensitive
- [ ] Partial matches work
- [ ] No results message shows when appropriate
- [ ] Can clear search
- [ ] Recent searches show (if enabled)
- [ ] Search is fast (< 500ms)
- [ ] Search pagination works if many results

#### Filters
- [ ] Filter panel opens/closes
- [ ] Can filter by multiple criteria
- [ ] Filters apply immediately or on "Apply"
- [ ] Active filters show as badges
- [ ] Can clear individual filters
- [ ] Can clear all filters
- [ ] Filter combinations work correctly
- [ ] Filter state persists on refresh (if applicable)
- [ ] Filter count shows accurate results

### 8. API Endpoints

#### Authentication Endpoints
- [ ] POST /api/auth/register - creates user
- [ ] POST /api/auth/login - authenticates user
- [ ] POST /api/auth/logout - clears session
- [ ] POST /api/auth/refresh - renews token
- [ ] POST /api/auth/forgot-password - sends reset link
- [ ] POST /api/auth/reset-password - resets password
- [ ] POST /api/auth/verify-email - confirms email
- [ ] GET /api/auth/me - gets current user

#### Task Endpoints
- [ ] POST /api/tasks - creates task
- [ ] GET /api/tasks - lists all tasks
- [ ] GET /api/tasks/:id - gets task details
- [ ] PUT /api/tasks/:id - updates task
- [ ] DELETE /api/tasks/:id - deletes task
- [ ] PATCH /api/tasks/:id/status - updates only status
- [ ] GET /api/tasks?filter=status:open - filters work
- [ ] POST /api/tasks/:id/assign - assigns task

#### Notification Endpoints
- [ ] POST /api/notifications/subscribe - subscribes to notifications
- [ ] POST /api/notifications/unsubscribe - unsubscribes
- [ ] GET /api/notifications - lists notifications
- [ ] PATCH /api/notifications/:id/read - marks as read
- [ ] DELETE /api/notifications/:id - deletes notification
- [ ] POST /api/line/webhook - receives LINE messages

#### File Endpoints
- [ ] POST /api/files/upload - uploads file
- [ ] GET /api/files - lists files
- [ ] GET /api/files/:id/download - downloads file
- [ ] DELETE /api/files/:id - deletes file
- [ ] PATCH /api/files/:id - updates file metadata

#### Rate Limiting
- [ ] Rate limiting returns 429 when exceeded
- [ ] Error message includes retry-after header
- [ ] Rate limit counter resets at correct interval
- [ ] Authenticated users have higher limit
- [ ] Public endpoints have lower limit

### 9. Data Validation

#### Frontend Validation
- [ ] Required fields show error
- [ ] Email format validated
- [ ] Password complexity checked
- [ ] Number fields accept only numbers
- [ ] Date fields accept valid dates only
- [ ] URL fields validate URL format
- [ ] No XSS scripts accepted in text fields
- [ ] Max length enforced
- [ ] Min length enforced
- [ ] Error messages are clear

#### Backend Validation
- [ ] Validates all frontend validations server-side
- [ ] Rejects invalid data format
- [ ] Rejects null values where required
- [ ] Rejects oversized inputs
- [ ] Sanitizes user input
- [ ] Prevents SQL injection
- [ ] Prevents NoSQL injection
- [ ] Prevents XSS attacks
- [ ] Returns proper error codes (400, 422, etc.)

### 10. Error Handling

#### Network Errors
- [ ] Offline state detected and shown
- [ ] Retry option appears for failed requests
- [ ] Automatic retry with exponential backoff works
- [ ] Max retries respected
- [ ] User-friendly error message shows

#### Server Errors
- [ ] 500 errors show error message
- [ ] 404 errors show "Not Found"
- [ ] 403 errors show "Permission Denied"
- [ ] 401 errors redirect to login
- [ ] Error can be reported/logged
- [ ] Specific error codes in response

#### Validation Errors
- [ ] Validation errors show for each field
- [ ] Invalid fields are highlighted
- [ ] Field-level error messages show
- [ ] Form cannot submit with errors
- [ ] Error messages suggest fix
- [ ] Errors clear when field corrected

### 11. Performance Requirements

#### Page Load
- [ ] Homepage loads in < 3 seconds (WiFi)
- [ ] Dashboard loads in < 3 seconds
- [ ] Search results appear in < 500ms
- [ ] File list loads in < 2 seconds
- [ ] No layout shift after loading
- [ ] Images lazy-load appropriately

#### Database Queries
- [ ] Task list query < 100ms
- [ ] User profile query < 50ms
- [ ] Notification query < 100ms
- [ ] File list query < 150ms
- [ ] No N+1 queries
- [ ] Pagination prevents large result sets

#### Memory
- [ ] Page memory usage < 50MB
- [ ] No memory leaks over time
- [ ] Unused components release memory

### 12. Security Testing

#### Authentication Security
- [ ] Passwords hashed, never stored plaintext
- [ ] Tokens include expiration
- [ ] Tokens are secure (httpOnly, Secure flags)
- [ ] CSRF tokens required for state-changing requests
- [ ] Session timeout implemented
- [ ] Cannot reuse old tokens

#### SQL/NoSQL Injection
- [ ] Parameterized queries used for database
- [ ] No raw string concatenation in queries
- [ ] Special characters escaped

#### XSS Prevention
- [ ] User input is escaped in output
- [ ] Event handlers don't accept user code
- [ ] HTML sanitization applied where needed
- [ ] Content Security Policy enforced

#### CORS Security
- [ ] Only allowed origins can access API
- [ ] Wildcard CORS (*) not used
- [ ] Credentials not exposed unnecessarily

### 13. Accessibility (WCAG 2.1 AA)

#### Keyboard Navigation
- [ ] All interactive elements reachable via Tab
- [ ] Tab order is logical
- [ ] No keyboard traps
- [ ] Can use Enter to activate buttons
- [ ] Can use Space to toggle checkboxes
- [ ] Can use Arrow keys in select dropdowns
- [ ] Can use Escape to close modals

#### Screen Reader
- [ ] Page title is descriptive
- [ ] Headings create outline
- [ ] Form labels associated with inputs
- [ ] Buttons have accessible labels
- [ ] Images have alt text
- [ ] ARIA labels used where needed
- [ ] Focus order is logical

#### Visual
- [ ] Text contrast is at least 4.5:1
- [ ] Color is not only way to convey info
- [ ] Focus indicators visible
- [ ] No content lost when zoomed to 200%
- [ ] No auto-playing audio/video

#### Content
- [ ] Language of page specified
- [ ] Links are descriptive (not "click here")
- [ ] Error messages identify problem
- [ ] Instructions are clear
- [ ] PDFs are tagged and accessible

---

## Test Execution Report Template

**Date:** [DATE]  
**Tester:** [NAME]  
**Environment:** [Staging/Production]  
**Browser/Device:** [Chrome 120 on Windows 10]  

### Summary
- **Total Tests:** [X]
- **Passed:** [X]
- **Failed:** [X]
- **Blocked:** [X]
- **Pass Rate:** [X%]

### Failed Tests

| # | Module | Test Case | Error | Severity | Notes |
|---|--------|-----------|-------|----------|-------|
| 1 | Auth | Login with invalid email | Shows error | Low | Expected behavior |
| 2 | Task | Create task | API error | High | Need to investigate |

### Environment Issues
- [ ] None
- [ ] Database performance degraded
- [ ] API responding slowly
- [ ] Network issues
- [ ] Other: [Describe]

### Recommendations
1. [Action Item 1]
2. [Action Item 2]
3. [Action Item 3]

---

**Status:** ✅ Ready for Functional Testing Execution

