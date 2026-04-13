# Firebase Setup Tutorial — TaskAm Project

## 📚 สารบัญ
1. [Firebase Console Setup](#firebase-console-setup)
2. [Authentication](#authentication)
3. [Firestore Database](#firestore-database)
4. [Backend Integration](#backend-integration)
5. [Frontend Integration](#frontend-integration)
6. [Common Issues & Fixes](#common-issues--fixes)

---

## Firebase Console Setup

### Step 1: สร้าง Firebase Project

1. ไปที่ **Firebase Console**: https://console.firebase.google.com
2. กด **+ Create a new project**
3. ตั้งชื่อ: `internsite-track` (หรือชื่ออื่น)
4. เลือก **Disable Google Analytics** (ไม่จำเป็นสำหรับตัวอย่าง)
5. กด **Create project** → รอประมาณ 1-2 นาที

### Step 2: ดึง Credentials

**สำหรับ Backend (Node.js + Express):**

1. ไปที่ **Project Settings** (เกียร์ icon ด้านบนขวา)
2. แท็บ **Service Accounts**
3. เลือก **Node.js**
4. กด **Generate New Private Key**
5. ไฟล์ JSON ดาวน์โหลดมา — **เก็บอย่างปลอดภัย!**

**สำหรับ Frontend (React):**

1. ไปที่ **Project Settings** → **General**
2. หา section **Your apps** → เลือก Web app (ถ้ายังไม่มีกด +)
3. Copy config object:
   ```javascript
   {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   }
   ```

### Step 3: บันทึก Environment Variables

**สร้างไฟล์ `.env` ในโปรเจกต์:**

```bash
# Backend (Node.js)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Frontend (React - เปลี่ยน VITE_ prefix)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=1:your-sender-id:web:your-app-id
```

---

## Authentication

### Enable Email/Password Sign-In

1. Firebase Console → **Authentication** (เมนูซ้าย)
2. แท็บ **Sign-in method**
3. กด **Email/Password** → **Enable** → **Save**

### Backend: Initialize Firebase Admin

**ไฟล์: `server/config/firebase-admin.ts`**

```typescript
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// ⚠️ CRITICAL: Default import, NOT namespace import
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

export default admin;
```

**ทำไมต้อง default import?**
- ESM project ต้อง `import admin from "firebase-admin"` (ไม่ใช่ `import * as admin`)
- ถ้าใช้ namespace import จะเกิด `TypeError: Cannot read properties of undefined`

### Frontend: Initialize Firebase

**ไฟล์: `src/services/firebase.ts`**

```typescript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Create Test Users

```bash
# ใช้ Firebase Console หรือ script นี้:
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ ... });
admin.auth().createUser({
  email: 'admin@taskam.local',
  password: 'admin123',
  displayName: 'Admin User'
}).then(user => console.log('Created:', user.uid));
"
```

---

## Firestore Database

### Step 1: สร้าง Firestore Database

1. Firebase Console → **Firestore Database** (เมนูซ้าย)
2. กด **Create database**
3. เลือก **Start in test mode** (สำหรับพัฒนา)
4. เลือก location: **asia-southeast1** (ใกล้ประเทศไทย)
5. กด **Create**

### Step 2: สร้าง Collections

**Collection: `users`**
```json
{
  "uid": "kWXiuVUTeKVkoptbh6cR9OUZb3M2",
  "email": "admin@taskam.local",
  "role": "admin",
  "name": "Admin User",
  "createdAt": "2026-04-07T09:00:00Z"
}
```

**Collection: `tasks`**
```json
{
  "title": "Fix login bug",
  "description": "Users cannot login with email",
  "status": "in_progress",
  "assigned_to": "tsVDbvFmcAS2kDCIXXhlAVpqxCY2",
  "due_date": "2026-04-10",
  "created_by": "kWXiuVUTeKVkoptbh6cR9OUZb3M2",
  "created_at": "2026-04-07T09:00:00Z",
  "line_user_id": "U10bc0ddb2c2afa4a3a371796caa9ad01"
}
```

**Collection: `holidays`**
```json
{
  "date": "2026-01-01",
  "name": "วันขึ้นปีใหม่",
  "type": "holiday",
  "year": 2026
}
```

**Collection: `saturday_schedules`**
```json
{
  "date": "2026-04-11",
  "users": [
    "tsVDbvFmcAS2kDCIXXhlAVpqxCY2",
    "anotherUserId"
  ],
  "created_at": "2026-04-07T09:00:00Z"
}
```

**Collection: `app_settings`** (document: `line_config`)
```json
{
  "group_id": "C675a1f9ed3cbb681f3b5d9651aaf0f80",
  "admin_user_id": "Ue6f844b01993a40329150aa655678b20",
  "user_guide": "...",
  "updated_at": "2026-04-07T09:00:00Z"
}
```

### Step 3: ตั้ง Firestore Rules

**Development Mode (ห้ามใช้ใน Production!)**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Production Mode (ต้อง authenticate)**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Tasks: read if assigned, write if admin
    match /tasks/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Holidays: read all, write admin only
    match /holidays/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Settings: read all, admin only write
    match /app_settings/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

## Backend Integration

### Setup: Initialize in `server.ts`

```typescript
import admin from "./config/firebase-admin";

const app = express();

// ✅ Test Firebase connection
admin.firestore().collection("users").limit(1).get()
  .then(() => console.log("✅ Firestore connection verified"))
  .catch(err => console.error("❌ Firestore error:", err));

app.listen(3694, () => console.log("🚀 Server running on port 3694"));
```

### Read Data: Query Examples

```typescript
// Get single document
const userDoc = await admin.firestore()
  .collection("users")
  .doc(userId)
  .get();
console.log(userDoc.data());

// Query multiple documents
const tasks = await admin.firestore()
  .collection("tasks")
  .where("assigned_to", "==", userId)
  .get();

tasks.forEach(doc => console.log(doc.data()));

// Get all documents (careful with large collections!)
const allHolidays = await admin.firestore()
  .collection("holidays")
  .get();
```

### Write Data: Create/Update/Delete

```typescript
// Create document
await admin.firestore().collection("tasks").add({
  title: "New Task",
  status: "to_do",
  created_at: new Date(),
});

// Update document
await admin.firestore()
  .collection("tasks")
  .doc(taskId)
  .update({ status: "done" });

// Delete document
await admin.firestore()
  .collection("tasks")
  .doc(taskId)
  .delete();

// Batch write
const batch = admin.firestore().batch();
batch.set(admin.firestore().collection("users").doc(uid), userData);
batch.update(admin.firestore().collection("stats").doc("total"), {
  user_count: admin.firestore.FieldValue.increment(1),
});
await batch.commit();
```

### Custom Claims: Set Admin Role

```typescript
// ทำให้ user เป็น admin
await admin.auth().setCustomUserClaims(uid, { admin: true });

// ใช้ใน Firestore Rules:
allow write: if request.auth.token.admin == true;
```

---

## Frontend Integration

### Authentication Service

**ไฟล์: `src/services/authService.ts`**

```typescript
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

export const authService = {
  async login(email: string, password: string) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  async logout() {
    await signOut(auth);
  },

  onAuthStateChanged(callback: (user: any) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async getIdToken() {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  },
};
```

### Firestore Service

**ไฟล์: `src/services/firestoreService.ts`**

```typescript
import { db } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  doc,
} from "firebase/firestore";

export const taskService = {
  async getTasks(userId: string) {
    const q = query(
      collection(db, "tasks"),
      where("assigned_to", "==", userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async createTask(taskData: any) {
    const docRef = await addDoc(collection(db, "tasks"), {
      ...taskData,
      created_at: new Date(),
    });
    return docRef.id;
  },

  async updateTask(taskId: string, updates: any) {
    await updateDoc(doc(db, "tasks", taskId), updates);
  },

  async deleteTask(taskId: string) {
    await deleteDoc(doc(db, "tasks", taskId));
  },
};
```

### Real-time Listener

```typescript
import { onSnapshot } from "firebase/firestore";

// Listen to real-time updates
const unsubscribe = onSnapshot(
  query(collection(db, "tasks"), where("assigned_to", "==", userId)),
  (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTasks(tasks); // React state update
  },
  (error) => console.error("Error:", error)
);

// Cleanup listener
return () => unsubscribe();
```

---

## Common Issues & Fixes

### ❌ Error: `PERMISSION_DENIED: Cloud Firestore API has not been enabled`

**Fix:**
1. ไปที่ Google Cloud Console: https://console.cloud.google.com
2. เลือก Project → **APIs & Services** → **Library**
3. ค้นหา "Firestore"
4. กด **Enable**

### ❌ Error: `Error: 5 NOT_FOUND`

**Fix:** Firestore database ยังไม่มี
1. Firebase Console → **Firestore Database**
2. กด **Create database**

### ❌ Error: `auth/invalid-api-key`

**Fix:** Frontend env var ผิด
1. ตรวจ `.env` — ต้องเป็น `VITE_FIREBASE_*` (ไม่ใช่ `FIREBASE_*`)
2. Restart dev server: `npm run dev`

### ❌ Error: `auth/configuration-not-found`

**Fix:** Email/Password auth ยังไม่เปิด
1. Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Email/Password**

### ❌ Error: `TypeError: Cannot read properties of undefined (reading 'length')`

**Fix:** Backend import firebase-admin ผิด
```typescript
// ❌ WRONG
import * as admin from "firebase-admin";

// ✅ CORRECT
import admin from "firebase-admin";
```

### ❌ Firestore 403 Forbidden

**Fix:** Firestore Rules ห้ามเข้า
1. Firebase Console → **Firestore** → **Rules**
2. ตั้ง test mode หรือ customize rules

---

## 🔗 Reference Links

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firestore Guide**: https://firebase.google.com/docs/firestore
- **Firebase Admin SDK**: https://firebase.google.com/docs/database/admin/start
- **Firebase Auth**: https://firebase.google.com/docs/auth
- **Google Cloud Console**: https://console.cloud.google.com

---

## 📝 Checklist

- [ ] Create Firebase project
- [ ] Download service account JSON
- [ ] Add environment variables to `.env`
- [ ] Enable Firestore API in Google Cloud
- [ ] Create Firestore database (asia-southeast1)
- [ ] Create collections (users, tasks, holidays, etc.)
- [ ] Enable Email/Password authentication
- [ ] Test backend connection
- [ ] Test frontend login
- [ ] Set Firestore rules (production)
- [ ] Create admin user

---

**Last Updated:** April 7, 2026  
**Version:** 1.0
