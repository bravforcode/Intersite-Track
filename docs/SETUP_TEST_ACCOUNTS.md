# Setting Up Test Accounts

This guide explains how to set up the test accounts (Admin and Staff) for local development.

## Quick Summary

1. Create Firebase Auth users via Firebase Console
2. Run the setup script to create Firestore profiles  
3. Start the dev server and login

## Step-by-Step Guide

### Step 1: Create Firebase Auth Users in Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., "intersite-track" or similar)
3. Click **Authentication** in the left sidebar
4. Click the **Users** tab
5. Click **"Add user"** button at the top

**Create Admin Account:**
- Email: `admin@taskam.local`
- Password: `admin123`
- Click **"Create user"**

**Create Staff Account:**
- Email: `somchai@taskam.local`
- Password: `staff123`
- Click **"Create user"**

✅ You should now see both users listed in the Authentication → Users tab

### Step 2: Create Firestore Profiles

If you haven't already, install dependencies:

```bash
npm install
```

Verify your `.env` has the Firebase credentials (should already be set up):

```env
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=your-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Run the setup script to create Firestore profiles:

```bash
npx tsx scripts/setup-users.ts
```

Expected output:

```
✅ Created profile for admin@taskam.local (uid: xxxxxxxx)
✅ Created profile for somchai@taskam.local (uid: xxxxxxxx)

Done! Now restart the server and try logging in.
```

❌ If you get `Failed for admin@taskam.local:` errors, it means:
- The Firebase Auth user doesn't exist yet (go back to Step 1)
- Or the Firebase credentials in `.env` are wrong

### Step 3: Start Dev Server

```bash
npm run dev
```

The app will start on [http://localhost:5173](http://localhost:5173)

### Step 4: Login with Test Account

1. Optional: enable quick login in local `.env` only:
   - `VITE_ENABLE_QUICK_LOGIN=true`
   - `VITE_QUICK_LOGIN_ADMIN_EMAIL=admin@taskam.local`
   - `VITE_QUICK_LOGIN_ADMIN_PASSWORD=admin123`
   - `VITE_QUICK_LOGIN_STAFF_EMAIL=somchai@taskam.local`
   - `VITE_QUICK_LOGIN_STAFF_PASSWORD=staff123`
2. Click **"แอดมิน (Admin)"** or **"พนักงาน (Staff)"** quick login button
2. OR manually enter:
   - Email: `admin@taskam.local`
   - Password: `admin123`
3. Click **"เข้าสู่ระบบ"** (Sign In)

✅ You should now be logged in!

## Troubleshooting

### "ไม่พบข้อมูลผู้ใช้" (User profile not found) - 401 Error

This means the Firestore profile wasn't created. Run Step 2 again using the setup script.

### "อีเมลหรือรหัสผ่านไม่ถูกต้อง" (Invalid credentials) - Firebase Auth Error

This means the Firebase Auth user doesn't exist. Check the Firebase Console and create the accounts in Step 1.

### Setup script fails with "Missing Firebase" error

Check that `.env` has all required Firebase variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (must include the full key with newlines)

### Still getting 500 errors?

Check the backend console for errors:
```
npm run dev:be  # Run backend only
```

Look for `[AUTH]` prefixed error messages. Common issues:
- Invalid Firebase Admin SDK initialization
- Firestore connectivity issues
- Token verification failures

## For Production / New Environments

To create additional users in production:

1. Create the Firebase Auth user via:
   - Firebase Console Authentication tab, OR
   - Your account registration endpoint

2. Create the Firestore profile by having the user complete onboarding (if implemented), OR manually via firebase console Firestore tab

3. Ensure the profile has:
   - `email` (string)
   - `role` (string: "admin" or "staff")
   - `first_name` (string)
   - `last_name` (string)
   - `created_at` (ISO timestamp)
   - Other fields as needed

## API Implementation

When a user signs up via the app:

1. Frontend calls `POST /api/auth/signup`
2. Backend creates Firebase Auth user
3. Backend creates Firestore profile with default role "staff"
4. Frontend gets Firebase ID token via `signInWithEmailAndPassword()`
5. Frontend calls `POST /api/auth/profile` with token
6. Backend returns user profile (role, dept, etc.)

The development test accounts skip the signup flow and are manually created in steps 1-2 above.
