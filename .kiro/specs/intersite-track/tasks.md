# Implementation Plan: Intersite Track

## Overview

This implementation plan refactors the Intersite Track application from a monolithic structure into a well-organized, maintainable codebase. The approach follows a systematic progression: first establishing the foundational architecture (backend structure, authentication), then deconstructing the frontend into modular components, implementing typography improvements, and finally preparing for production deployment.

The implementation is designed to be incremental, with each task building on previous work while maintaining a functional application throughout the refactoring process.

## Tasks

- [x] 1. Set up project structure and configuration
  - Create backend directory structure (server/, config/, routes/, controllers/, middleware/, database/)
  - Create frontend directory structure (components/, services/, types/, utils/, hooks/)
  - Set up ESLint and Prettier configuration files
  - Install required dependencies (bcrypt, jsonwebtoken, express-rate-limit, @vercel/blob)
  - _Requirements: 2.1, 2.6, 3.1_

- [x] 2. Implement secure authentication system
  - [x] 2.1 Create password hashing utilities
    - Implement bcrypt-based password hashing functions in server/utils/password.ts
    - Create password verification function
    - Add password strength validation (minimum 8 characters)
    - _Requirements: 6.1, 6.9_

  - [ ]* 2.2 Write property test for password hashing
    - **Property 11: Password Storage Security**
    - **Validates: Requirements 6.11**

  - [x] 2.3 Create JWT utilities and configuration
    - Implement JWT token generation in server/utils/jwt.ts
    - Implement JWT token verification function
    - Create JWT configuration in server/config/jwt.ts with 24-hour expiration
    - _Requirements: 6.2, 6.4, 6.5_

  - [ ]* 2.4 Write property test for JWT token generation
    - **Property 8: JWT Token Generation**
    - **Validates: Requirements 6.2**

  - [x] 2.5 Implement authentication middleware
    - Create JWT verification middleware in server/middleware/auth.middleware.ts
    - Add user data extraction to Express Request type
    - Implement role-based access control helper
    - _Requirements: 6.3_

  - [ ]* 2.6 Write property test for JWT token validation
    - **Property 9: JWT Token Validation**
    - **Validates: Requirements 6.3, 6.8**

  - [x] 2.7 Implement rate limiting middleware
    - Create rate limiting middleware for login endpoint (5 attempts per 15 minutes)
    - Configure exponential backoff for repeated violations
    - _Requirements: 6.10_

  - [ ]* 2.8 Write unit tests for authentication middleware
    - Test JWT validation with valid tokens
    - Test JWT validation with expired tokens
    - Test JWT validation with invalid tokens
    - Test rate limiting behavior
    - _Requirements: 6.3, 6.7, 6.8, 6.10_

- [x] 3. Checkpoint - Verify authentication system
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extract database layer
  - [x] 4.1 Create database connection module
    - Implement connection pool configuration in server/database/connection.ts
    - Configure connection pooling for serverless environment (max: 1)
    - Add transaction support helper
    - _Requirements: 2.3, 2.6, 5.6_

  - [x] 4.2 Create user queries module
    - Implement user CRUD operations in server/database/queries/user.queries.ts
    - Add findByUsername, findById, findAll, create, update, delete functions
    - Add updatePassword function for password changes
    - _Requirements: 2.3, 6.12_

  - [x] 4.3 Create task queries module
    - Implement task CRUD operations in server/database/queries/task.queries.ts
    - Add filtering support for status, priority, assignee, date range
    - Implement task assignment management (setAssignments, getAssignments)
    - _Requirements: 2.3_

  - [x] 4.4 Create notification and report queries modules
    - Implement notification queries in server/database/queries/notification.queries.ts
    - Implement report queries in server/database/queries/report.queries.ts
    - _Requirements: 2.3_

  - [ ]* 4.5 Write unit tests for database queries
    - Test user queries with mock database
    - Test task queries with filtering
    - Test transaction rollback scenarios
    - _Requirements: 2.3_

- [x] 5. Implement backend controllers
  - [x] 5.1 Create authentication controller
    - Implement login endpoint handler in server/controllers/auth.controller.ts
    - Implement token validation endpoint handler
    - Implement password change endpoint handler with old password verification
    - _Requirements: 2.2, 2.8, 6.6, 6.12_

  - [x] 5.2 Create user controller
    - Implement user CRUD endpoints in server/controllers/user.controller.ts
    - Add user listing, creation, update, deletion handlers
    - _Requirements: 2.2, 2.8_

  - [x] 5.3 Create task controller
    - Implement task CRUD endpoints in server/controllers/task.controller.ts
    - Add task status update handler
    - Implement task updates and checklist handlers
    - _Requirements: 2.2, 2.8_

  - [x] 5.4 Create department, task type, notification, and report controllers
    - Implement remaining controllers in server/controllers/
    - Ensure each controller function handles exactly one endpoint operation
    - _Requirements: 2.2, 2.8_

  - [ ]* 5.5 Write property test for error handling consistency
    - **Property 2: Error Handling Consistency**
    - **Validates: Requirements 2.5**

  - [ ]* 5.6 Write unit tests for controllers
    - Test authentication controller with valid/invalid credentials
    - Test password change with correct/incorrect old password
    - Test task controller CRUD operations
    - Test error responses for each controller
    - _Requirements: 2.2, 2.5, 6.6, 6.12_

- [x] 6. Create backend routes and error handling
  - [x] 6.1 Implement centralized error handling middleware
    - Create error handler in server/middleware/error.middleware.ts
    - Implement consistent error response format
    - Add logging for error monitoring
    - _Requirements: 2.5_

  - [x] 6.2 Create route modules
    - Implement auth routes in server/routes/auth.routes.ts
    - Implement user routes in server/routes/user.routes.ts
    - Implement task routes in server/routes/task.routes.ts
    - Implement department, task type, notification, report routes
    - Organize routes by resource type
    - _Requirements: 2.1, 2.4_

  - [x] 6.3 Create route aggregator and refactor server.ts
    - Create server/routes/index.ts to aggregate all routes
    - Refactor server.ts to use route modules and middleware
    - Reduce server.ts to less than 100 lines (server initialization only)
    - _Requirements: 2.1, 2.7_

  - [ ]* 6.4 Write property test for serverless compatibility
    - **Property 7: Serverless Function Compatibility**
    - **Validates: Requirements 5.4**

  - [ ]* 6.5 Write integration tests for API endpoints
    - Test complete authentication flow
    - Test protected endpoints with/without valid tokens
    - Test CRUD operations for each resource
    - _Requirements: 2.1, 2.2, 2.5, 6.3_

- [x] 7. Checkpoint - Verify backend restructuring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Extract frontend type definitions
  - [x] 8.1 Create type definition files
    - Extract User, Task, TaskUpdate, ChecklistItem types to src/types/
    - Create user.ts, task.ts, notification.ts, common.ts type files
    - Create src/types/index.ts to re-export all types
    - _Requirements: 1.5_

  - [ ]* 8.2 Write unit tests for type definitions
    - Test type guards and validators
    - _Requirements: 1.5_

- [x] 9. Create frontend services layer
  - [x] 9.1 Implement base API service
    - Create API client with request/response handling in src/services/api.ts
    - Implement HTTP methods (get, post, put, patch, delete)
    - Add token injection from localStorage
    - Add error handling for network failures and HTTP errors
    - _Requirements: 1.2_

  - [x] 9.2 Implement authentication service
    - Create authService.ts with login, logout, validateToken functions
    - Implement token storage management (getStoredToken, setToken, clearToken)
    - _Requirements: 1.2_

  - [x] 9.3 Implement resource services
    - Create taskService.ts with task CRUD and filtering operations
    - Create userService.ts with user management operations
    - Create notificationService.ts and reportService.ts
    - _Requirements: 1.2_

  - [ ]* 9.4 Write property test for named exports
    - **Property 1: Named Exports Consistency**
    - **Validates: Requirements 1.8**

  - [ ]* 9.5 Write unit tests for services
    - Test API service error handling
    - Test authentication service token management
    - Test task service filtering logic
    - Mock fetch/axios for isolated testing
    - _Requirements: 1.2_

- [-] 10. Extract common UI components
  - [-] 10.1 Create base UI components
    - Extract Button component to src/components/common/Button.tsx
    - Extract Modal component to src/components/common/Modal.tsx
    - Extract Input component to src/components/common/Input.tsx
    - Extract Card component to src/components/common/Card.tsx
    - Ensure each component has single responsibility
    - _Requirements: 1.1, 1.6_

  - [ ] 10.2 Create layout components
    - Extract Sidebar to src/components/layout/Sidebar.tsx
    - Extract Header to src/components/layout/Header.tsx
    - Create MainLayout component in src/components/layout/MainLayout.tsx
    - _Requirements: 1.1, 1.6_

  - [ ]* 10.3 Write unit tests for common components
    - Test Button with different variants
    - Test Modal open/close behavior
    - Test Input validation display
    - _Requirements: 1.1, 1.6_

- [ ] 11. Extract authentication components
  - [ ] 11.1 Create authentication components
    - Extract LoginForm to src/components/auth/LoginForm.tsx
    - Extract ProfileModal to src/components/auth/ProfileModal.tsx
    - Integrate with authService for API calls
    - _Requirements: 1.1, 1.6_

  - [ ]* 11.2 Write unit tests for authentication components
    - Test LoginForm submission
    - Test ProfileModal password change
    - Test error message display
    - _Requirements: 1.1_

- [ ] 12. Extract dashboard feature components
  - [ ] 12.1 Create dashboard components
    - Extract DashboardPage to src/components/dashboard/DashboardPage.tsx
    - Extract StatCard to src/components/dashboard/StatCard.tsx
    - Extract UpcomingTasks to src/components/dashboard/UpcomingTasks.tsx
    - Organize components in hierarchical folder structure
    - _Requirements: 1.1, 1.3, 1.6_

  - [ ]* 12.2 Write unit tests for dashboard components
    - Test DashboardPage rendering with stats
    - Test StatCard with different values
    - _Requirements: 1.1_

- [ ] 13. Extract task management feature components
  - [ ] 13.1 Create task components
    - Extract TasksPage to src/components/tasks/TasksPage.tsx
    - Extract TaskCard to src/components/tasks/TaskCard.tsx
    - Extract TaskDetailModal to src/components/tasks/TaskDetailModal.tsx
    - Extract TaskFormModal to src/components/tasks/TaskFormModal.tsx
    - Extract TaskFilters to src/components/tasks/TaskFilters.tsx
    - _Requirements: 1.1, 1.3, 1.6_

  - [ ]* 13.2 Write unit tests for task components
    - Test TasksPage with filtering
    - Test TaskCard display
    - Test TaskFormModal validation
    - Test TaskDetailModal updates
    - _Requirements: 1.1_

- [ ] 14. Extract remaining feature components
  - [ ] 14.1 Create staff management components
    - Extract StaffPage to src/components/staff/StaffPage.tsx
    - Extract StaffTable to src/components/staff/StaffTable.tsx
    - Extract UserFormModal to src/components/staff/UserFormModal.tsx
    - _Requirements: 1.1, 1.3, 1.6_

  - [ ] 14.2 Create reports components
    - Extract ReportsPage to src/components/reports/ReportsPage.tsx
    - Extract StaffReportTable to src/components/reports/StaffReportTable.tsx
    - _Requirements: 1.1, 1.3, 1.6_

  - [ ] 14.3 Create notifications components
    - Extract NotificationsPage to src/components/notifications/NotificationsPage.tsx
    - Extract NotificationItem to src/components/notifications/NotificationItem.tsx
    - _Requirements: 1.1, 1.3, 1.6_

  - [ ] 14.4 Create settings components
    - Extract SettingsPage to src/components/settings/SettingsPage.tsx
    - Extract DepartmentSettings to src/components/settings/DepartmentSettings.tsx
    - Extract TaskTypeSettings to src/components/settings/TaskTypeSettings.tsx
    - _Requirements: 1.1, 1.3, 1.6_

  - [ ]* 14.5 Write unit tests for remaining components
    - Test staff management components
    - Test reports components
    - Test notifications components
    - Test settings components
    - _Requirements: 1.1_

- [ ] 15. Extract utility functions and refactor App.tsx
  - [ ] 15.1 Create utility modules
    - Extract date/text formatting functions to src/utils/formatters.ts
    - Extract constants to src/utils/constants.ts
    - Extract validation functions to src/utils/validators.ts
    - _Requirements: 1.4_

  - [ ] 15.2 Refactor App.tsx
    - Refactor App.tsx to use extracted components and services
    - Implement routing with extracted page components
    - Reduce App.tsx to less than 200 lines (application shell only)
    - Use named exports for all components and services
    - _Requirements: 1.1, 1.2, 1.7, 1.8_

  - [ ]* 15.3 Write unit tests for utilities
    - Test date formatting functions
    - Test validation functions
    - _Requirements: 1.4_

- [ ] 16. Checkpoint - Verify frontend restructuring
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement typography system
  - [ ] 17.1 Configure font family and base styles
    - Add Noto Sans Thai and Inter fonts to index.html
    - Define font family stack in index.css
    - Set base font size to 14px with line-height 1.5
    - _Requirements: 4.1, 4.3, 4.5_

  - [ ] 17.2 Define typography scale
    - Create typography scale in index.css (xs: 12px, sm: 14px, base: 16px, lg: 18px, xl: 20px, 2xl: 24px, 3xl: 30px, 4xl: 36px)
    - Define heading styles (h1-h4) with appropriate sizes and line heights
    - Define line height values (tight: 1.25, normal: 1.5, relaxed: 1.75)
    - _Requirements: 4.2, 4.4, 4.8_

  - [ ] 17.3 Implement responsive typography
    - Add media queries for mobile (<768px), tablet (768-1023px), desktop (>=1024px)
    - Scale font sizes appropriately for each breakpoint
    - Ensure minimum 14px font size on mobile devices
    - _Requirements: 4.6_

  - [ ] 17.4 Apply typography system to components
    - Update all components to use typography classes/variables
    - Remove hardcoded font styles from components
    - Ensure consistent typography across all components
    - _Requirements: 4.7_

  - [ ]* 17.5 Write property test for minimum font size
    - **Property 5: Minimum Font Size Compliance**
    - **Validates: Requirements 4.3**

  - [ ]* 17.6 Write property test for typography consistency
    - **Property 6: Typography Consistency**
    - **Validates: Requirements 4.7**

  - [ ]* 17.7 Write unit tests for typography
    - Test responsive font scaling
    - Test heading hierarchy
    - _Requirements: 4.2, 4.6, 4.8_

- [ ] 18. Code cleanup and optimization
  - [ ] 18.1 Remove dead code
    - Analyze codebase for unreferenced functions, classes, variables
    - Remove dead code from frontend and backend
    - _Requirements: 3.3, 3.4_

  - [ ] 18.2 Format and lint codebase
    - Run Prettier on all TypeScript and JavaScript files
    - Run ESLint and fix all errors
    - Ensure zero TypeScript compilation errors
    - _Requirements: 3.1, 3.2, 3.7, 3.8_

  - [ ]* 18.3 Write property test for code formatting
    - **Property 3: Code Formatting Consistency**
    - **Validates: Requirements 3.1**

  - [ ]* 18.4 Write property test for dead code elimination
    - **Property 4: Dead Code Elimination**
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 18.5 Run full test suite
    - Execute all unit tests
    - Execute all property-based tests
    - Verify frontend functionality
    - Verify backend functionality
    - _Requirements: 3.5, 3.6_

- [ ] 19. Checkpoint - Verify code quality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Configure Vercel deployment
  - [ ] 20.1 Create Vercel configuration
    - Create vercel.json with build and route configuration
    - Configure serverless function for backend API
    - Configure static file serving for frontend
    - _Requirements: 5.1, 5.3, 5.5_

  - [ ] 20.2 Configure environment variables
    - Create .env.example with required variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, JWT_SECRET, JWT_EXPIRES_IN)
    - Document environment variable setup in README
    - _Requirements: 5.2_

  - [ ] 20.3 Create serverless API entry point
    - Create api/index.ts as Vercel serverless function entry point
    - Import and configure Express app from server/
    - Ensure compatibility with Vercel serverless constraints
    - _Requirements: 5.4_

  - [ ] 20.4 Configure build scripts
    - Update package.json with build:vercel script
    - Configure Vite build for production
    - _Requirements: 5.1_

  - [ ]* 20.5 Write unit tests for deployment configuration
    - Test environment variable loading
    - Test serverless function handler
    - _Requirements: 5.2, 5.4_

- [ ] 21. Final integration and verification
  - [ ] 21.1 Test complete application flow
    - Verify login/logout functionality
    - Verify task CRUD operations
    - Verify user management
    - Verify notifications
    - Verify reports
    - _Requirements: 3.5, 3.6_

  - [ ] 21.2 Verify deployment readiness
    - Test local build with production configuration
    - Verify static assets are served correctly
    - Verify API endpoints work with serverless configuration
    - _Requirements: 5.7, 5.8_

  - [ ]* 21.3 Run final test suite
    - Execute all unit tests
    - Execute all property-based tests
    - Generate coverage report
    - _Requirements: 3.5, 3.6_

- [ ] 22. Final checkpoint - Production ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and integration points
- The implementation maintains a working application throughout the refactoring process
- All authentication endpoints use secure bcrypt hashing and JWT tokens
- Typography system ensures minimum 14px font size and Thai language support
- Vercel configuration prepares the application for serverless deployment
