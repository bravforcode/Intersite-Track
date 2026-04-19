/**
 * Setup initial users in Firestore
 * Run: npx tsx scripts/setup-users.ts
 */
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

function optionalStaffSeed() {
  const email = process.env.SEED_STAFF_EMAIL?.trim().toLowerCase();
  if (!email) return [];

  return [
    {
      email,
      first_name: process.env.SEED_STAFF_FIRST_NAME?.trim() || "พนักงานทดสอบ",
      last_name: process.env.SEED_STAFF_LAST_NAME?.trim() || "",
      username: process.env.SEED_STAFF_USERNAME?.trim() || "staff",
      role: "staff",
      position: process.env.SEED_STAFF_POSITION?.trim() || "พนักงาน",
      department_id: null,
      line_user_id: null,
    },
  ];
}

async function setupUsers() {
  const users = [
    {
      email: "admin@taskam.local",
      first_name: "แอดมิน",
      last_name: "ระบบ",
      username: "admin",
      role: "admin",
      position: "ผู้ดูแลระบบ",
      department_id: null,
      line_user_id: null,
    },
    ...optionalStaffSeed(),
  ];

  for (const userData of users) {
    try {
      // Get Firebase Auth UID by email
      const authUser = await auth.getUserByEmail(userData.email);
      const uid = authUser.uid;

      // Create Firestore profile
      await db.collection("users").doc(uid).set({
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        username: userData.username,
        role: userData.role,
        position: userData.position,
        department_id: userData.department_id,
        line_user_id: userData.line_user_id,
        created_at: new Date().toISOString(),
      }, { merge: true });

      console.log(`✅ Created profile for ${userData.email} (uid: ${uid})`);
    } catch (err: any) {
      console.error(`❌ Failed for ${userData.email}: ${err.message}`);
    }
  }

  console.log("\nDone! Now restart the server and try logging in.");
  process.exit(0);
}

setupUsers();
