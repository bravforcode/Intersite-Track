import { supabase } from "../lib/supabase";
import { createApiClient } from "./apiClient";

const client = createApiClient({ supabase });

export const api = client.api;
export const setCachedAccessToken = client.setCachedAccessToken;
export const clearApiAuthState = client.clearApiAuthState;

export default api;
