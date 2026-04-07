import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

async function main() {
  const guide = fs.readFileSync("./GUIDE.md", "utf-8");

  await admin.firestore().collection("app_settings").doc("user_guide").set({
    content: guide,
    title: "Intersite Track — คู่มือการใช้งาน",
    updated_at: new Date(),
  });

  console.log("✅ Guide uploaded to Firestore!");
  console.log("📖 Access at: Firestore > app_settings > user_guide");
  process.exit(0);
}

main();
