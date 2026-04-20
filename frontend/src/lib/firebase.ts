/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

type AuthLike = {
  currentUser: { getIdToken: (forceRefresh?: boolean) => Promise<string>; email?: string | null } | null;
  onAuthStateChanged: (listener: (user: AuthLike["currentUser"]) => void) => () => void;
};

type FirestoreLike = ReturnType<typeof getFirestore> | null;

const isE2eMock = (import.meta.env.VITE_E2E_MOCK as string | undefined) === "1";

function readFirebaseEnv(name: string): string {
  return String(import.meta.env[name] ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "")
    .trim();
}

const firebaseConfig = {
  apiKey: readFirebaseEnv("VITE_FIREBASE_API_KEY"),
  authDomain: readFirebaseEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: readFirebaseEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: readFirebaseEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readFirebaseEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readFirebaseEnv("VITE_FIREBASE_APP_ID")
};

const missingFirebaseEnv = Object.entries(firebaseConfig)
  .filter(([, value]) => !String(value || "").trim())
  .map(([key]) => key);

if (missingFirebaseEnv.length > 0 && !isE2eMock) {
  throw new Error(`Missing Firebase config: ${missingFirebaseEnv.join(", ")}`);
}

type MockAuthListener = (user: AuthLike["currentUser"]) => void;

const mockAuthStorageKey = "e2eMockAuthUser";

function buildMockAuthUser(params: { email: string | null; token: string } | null): AuthLike["currentUser"] {
  return params === null
    ? null
    : {
        email: params.email,
        getIdToken: async () => params.token,
      };
}

function readStoredMockAuthUser(): AuthLike["currentUser"] {
  if (!isE2eMock || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(mockAuthStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email: string | null; token: string };
    if (!parsed.token) return null;
    return buildMockAuthUser(parsed);
  } catch {
    return null;
  }
}

let mockCurrentUser: AuthLike["currentUser"] = readStoredMockAuthUser();
const mockAuthListeners = new Set<MockAuthListener>();

export function setMockAuthUser(params: { email: string | null; token: string } | null): void {
  if (!isE2eMock) return;
  mockCurrentUser = buildMockAuthUser(params);
  try {
    if (params === null) {
      sessionStorage.removeItem(mockAuthStorageKey);
    } else {
      sessionStorage.setItem(mockAuthStorageKey, JSON.stringify(params));
    }
  } catch {
    // Storage can be unavailable in unusual browser contexts.
  }
  for (const listener of mockAuthListeners) {
    listener(mockCurrentUser);
  }
}

export function onMockAuthStateChanged(listener: MockAuthListener): () => void {
  if (!isE2eMock) return () => {};
  mockAuthListeners.add(listener);
  listener(mockCurrentUser);
  return () => {
    mockAuthListeners.delete(listener);
  };
}

export const firebaseApp = isE2eMock || missingFirebaseEnv.length > 0 ? null : initializeApp(firebaseConfig);
export const auth: AuthLike = isE2eMock
  ? {
      get currentUser() {
        return mockCurrentUser;
      },
      set currentUser(_value) {},
      onAuthStateChanged: (listener: MockAuthListener) => onMockAuthStateChanged(listener),
    } as unknown as AuthLike
  : (getAuth(firebaseApp!) as unknown as AuthLike);

export const firestore: FirestoreLike = isE2eMock || missingFirebaseEnv.length > 0 ? null : getFirestore(firebaseApp!);
