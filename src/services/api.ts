import { auth } from "../lib/firebase";
import { createApiClient } from "./apiClient";

// Firebase-compatible adapter matching the SupabaseClientLike interface
const firebaseAdapter = {
  auth: {
    getSession: async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return { data: { session: null } };
      try {
        const access_token = await currentUser.getIdToken();
        return { data: { session: { access_token } } };
      } catch {
        return { data: { session: null } };
      }
    },
    signOut: async (_options: { scope: "local" }) => {
      // Handled by authService.signOut
    },
  },
};

const client = createApiClient({ supabase: firebaseAdapter });

export const api = client.api;
export const setCachedAccessToken = client.setCachedAccessToken;
export const clearApiAuthState = client.clearApiAuthState;

export default api;
