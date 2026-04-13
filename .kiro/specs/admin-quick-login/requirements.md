# Requirements Document

## Introduction

This feature adds a Quick Login UI component to the TaskAm application's login page, enabling rapid testing and demonstration of role-based access control. The Quick Login section provides pre-configured test accounts for Admin and Staff roles, allowing developers and testers to instantly authenticate without manually entering credentials. Additionally, this specification includes guidance for setting up Supabase database collaboration to enable co-ownership with team members.

## Glossary

- **Quick_Login_UI**: A UI component displaying buttons for instant authentication with predefined test accounts
- **Test_Account**: A pre-seeded user account in Supabase Auth and the users table with known credentials for testing purposes
- **Login_Page**: The authentication interface component located at `src/components/auth/LoginPage.tsx`
- **Supabase_Auth**: The authentication service managing user sessions and JWT tokens
- **Users_Table**: The PostgreSQL table storing application user profiles with role and auth_id fields
- **Role**: User permission level, either "admin" or "staff"
- **Auth_Service**: The frontend service handling authentication operations via `src/services/authService.ts`
- **Seed_Script**: SQL script that creates test users in both Supabase Auth and the users table

## Requirements

### Requirement 1: Quick Login UI Component

**User Story:** As a developer or tester, I want quick access buttons on the login page, so that I can instantly authenticate as different roles without typing credentials.

#### Acceptance Criteria

1. THE Login_Page SHALL display a "ทดสอบเข้าสู่ระบบ (คลิกเพื่อเข้า)" section below the standard login form
2. THE Quick_Login_UI SHALL render two distinct buttons labeled "ผู้ดูแลระบบ (Admin)" and "พนักงาน (Staff)"
3. WHEN a user clicks the "ผู้ดูแลระบบ (Admin)" button, THE Quick_Login_UI SHALL auto-fill the email field with "admin@taskam.local" and the password field with "admin123", THEN THE Quick_Login_UI SHALL trigger the login submission
4. WHEN a user clicks the "พนักงาน (Staff)" button, THE Quick_Login_UI SHALL auto-fill the email field with "somchai@taskam.local" and the password field with "staff123", THEN THE Quick_Login_UI SHALL trigger the login submission
5. THE Quick_Login_UI SHALL display a visual separator (divider line or spacing) between the standard login form and the quick login buttons
6. THE Quick_Login_UI SHALL use styling consistent with the existing Login_Page design (colors, fonts, spacing)
7. WHEN the Auth_Service is processing a login request, THE Quick_Login_UI buttons SHALL be disabled to prevent duplicate submissions

### Requirement 2: Test Account Seeding

**User Story:** As a system administrator, I want test accounts pre-configured in the database, so that the Quick Login feature functions correctly in all environments.

#### Acceptance Criteria

1. THE Seed_Script SHALL create a Supabase Auth user with email "admin@taskam.local" and password "admin123"
2. THE Seed_Script SHALL create a Supabase Auth user with email "somchai@taskam.local" and password "staff123"
3. THE Seed_Script SHALL insert a corresponding record in the Users_Table for the admin account with role "admin", username "Admin Test", and the correct auth_id from Supabase Auth
4. THE Seed_Script SHALL insert a corresponding record in the Users_Table for the staff account with role "staff", username "Somchai Test", and the correct auth_id from Supabase Auth
5. THE Seed_Script SHALL be idempotent (running it multiple times SHALL NOT create duplicate users or cause errors)
6. THE Seed_Script SHALL verify email addresses automatically for test accounts to bypass email confirmation requirements
7. THE Seed_Script SHALL be documented with clear instructions for execution in development and staging environments

### Requirement 3: Authentication Flow Integration

**User Story:** As a developer, I want the Quick Login feature to use the existing authentication system, so that test logins follow the same security flow as production logins.

#### Acceptance Criteria

1. WHEN a Quick Login button is clicked, THE Auth_Service SHALL call `signInWithEmailAndPassword()` from Firebase Auth with the test account credentials
2. WHEN Firebase Auth returns a valid session, THE Auth_Service SHALL fetch the user profile from `/api/auth/profile`
3. WHEN the backend receives the profile request, THE auth middleware SHALL verify the JWT token via Firebase Admin `verifyIdToken()`
4. WHEN the JWT is valid, THE backend SHALL query the Users_Table using the auth_id to retrieve the user's role and profile data
5. WHEN authentication succeeds, THE Login_Page SHALL invoke the `onLogin` callback with the complete user object including role information
6. IF authentication fails for any reason, THE Login_Page SHALL display the standard error message returned by Auth_Service

### Requirement 4: Supabase Collaboration Setup Documentation

**User Story:** As a project owner, I want clear instructions for adding collaborators to the Supabase project, so that team members can co-manage the database and authentication system.

#### Acceptance Criteria

1. THE documentation SHALL provide step-by-step instructions for inviting a collaborator via the Supabase dashboard
2. THE documentation SHALL specify navigating to Project Settings → Team → Invite Member
3. THE documentation SHALL explain how to assign the "Administrator" role to grant full co-ownership permissions
4. THE documentation SHALL list the permissions granted by the Administrator role (database access, auth management, API key viewing, billing access)
5. THE documentation SHALL note that collaborators receive an email invitation and must accept it to gain access
6. THE documentation SHALL be written in Thai language to match the application's primary language
7. THE documentation SHALL be stored in a markdown file within the `.kiro/specs/admin-quick-login/` directory

### Requirement 5: Security Considerations

**User Story:** As a security-conscious developer, I want the Quick Login feature restricted to non-production environments, so that test credentials are not exposed in production deployments.

#### Acceptance Criteria

1. THE Quick_Login_UI SHALL only render when the application is running in development or staging mode
2. WHERE the environment is production, THE Login_Page SHALL NOT display the Quick Login section
3. THE Seed_Script documentation SHALL include a warning against running test account creation in production environments
4. THE test account credentials SHALL use the `.local` domain suffix to clearly indicate they are for local testing only
5. THE documentation SHALL recommend using environment variables or feature flags to control Quick Login visibility
