/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

type AuthLike = {
  currentUser: { getIdToken: () => Promise<string>; email?: string | null } | null;
  onAuthStateChanged: (listener: (user: AuthLike["currentUser"]) => void) => () => void;
};

type FirestoreLike = ReturnType<typeof getFirestore> | null;

const isE2eMock = (import.meta.env.VITE_E2E_MOCK as string | undefined) === "1";

const firebaseConfig = {
  apiKey: "AIzaSyBi9vhI6iTs_27m0We9jtt94Bo96RzO_dI",
  authDomain: "intersite-track02.firebaseapp.com",
  projectId: "intersite-track02",
  storageBucket: "intersite-track02.firebasestorage.app",
  messagingSenderId: "764386641110",
  appId: "1:764386641110:web:216ddcf775a436208af577"
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
