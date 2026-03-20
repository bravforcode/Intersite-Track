type Session = {
  access_token?: string;
} | null;

type SupabaseSessionResponse = {
  data: {
    session: Session;
  };
};

export interface SupabaseClientLike {
  auth: {
    getSession: () => Promise<SupabaseSessionResponse>;
    signOut: (options: { scope: "local" }) => Promise<unknown>;
  };
}

type StorageLike = Pick<Storage, "getItem" | "removeItem">;
type LocationLike = Pick<Location, "href">;

export interface ApiClientDependencies {
  supabase: SupabaseClientLike;
  baseUrl?: string;
  cacheTtlMs?: number;
  requestTimeoutMs?: number;
  fetchFn?: typeof fetch;
  storage?: StorageLike;
  location?: LocationLike;
  now?: () => number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export interface ApiClientInstance {
  api: {
    get: <T>(url: string) => Promise<T>;
    post: <T>(url: string, data: unknown) => Promise<T>;
    put: <T>(url: string, data: unknown) => Promise<T>;
    patch: <T>(url: string, data?: unknown) => Promise<T>;
    delete: <T>(url: string) => Promise<T>;
  };
  clearApiAuthState: () => void;
  setCachedAccessToken: (token: string | null) => void;
}

function readStoredUser(storage: StorageLike): { token?: string } | null {
  try {
    const raw = storage.getItem("user");
    return raw ? (JSON.parse(raw) as { token?: string }) : null;
  } catch {
    return null;
  }
}

function cloneData<T>(data: T): T {
  if (data === null || typeof data !== "object") {
    return data;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data)) as T;
}

export function createApiClient({
  supabase,
  baseUrl = "",
  cacheTtlMs = 1500,
  requestTimeoutMs = 10_000,
  fetchFn = globalThis.fetch.bind(globalThis),
  storage = globalThis.localStorage,
  location = globalThis.location,
  now = Date.now,
  setTimeoutFn = globalThis.setTimeout.bind(globalThis),
  clearTimeoutFn = globalThis.clearTimeout.bind(globalThis),
}: ApiClientDependencies): ApiClientInstance {
  const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
  const inFlightRequests = new Map<string, Promise<unknown>>();
  let cachedAccessToken: string | null = null;

  function setCachedAccessToken(token: string | null): void {
    cachedAccessToken = token;
  }

  function clearApiAuthState(): void {
    cachedAccessToken = null;
    responseCache.clear();
    inFlightRequests.clear();
  }

  async function getToken(): Promise<string | null> {
    if (cachedAccessToken) return cachedAccessToken;

    const storedUser = readStoredUser(storage);
    if (storedUser?.token) {
      cachedAccessToken = storedUser.token;
      return cachedAccessToken;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      cachedAccessToken = data.session.access_token;
      return cachedAccessToken;
    }

    return null;
  }

  async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const token = await getToken();
    const cacheKey = `${method}:${endpoint}:${token ?? "guest"}`;

    if (method === "GET") {
      const cached = responseCache.get(cacheKey);
      if (cached && cached.expiresAt > now()) {
        return cloneData(cached.data as T);
      }

      const existingRequest = inFlightRequests.get(cacheKey);
      if (existingRequest) {
        return existingRequest as Promise<T>;
      }
    } else {
      responseCache.clear();
    }

    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const executeRequest = async () => {
      const controller = new AbortController();
      const timeout = setTimeoutFn(() => controller.abort(), requestTimeoutMs);

      const res = await fetchFn(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
      }).finally(() => {
        clearTimeoutFn(timeout);
      });

      if (res.status === 401) {
        clearApiAuthState();
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        storage.removeItem("user");
        location.href = "/";
        throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "เกิดข้อผิดพลาด" }));
        const detail = typeof err.detail === "string" && err.detail ? ` (${err.detail})` : "";
        throw new Error((err.error || "เกิดข้อผิดพลาด") + detail);
      }

      if (res.status === 204) {
        return undefined as T;
      }

      const data = await res.json();

      if (method === "GET") {
        responseCache.set(cacheKey, {
          expiresAt: now() + cacheTtlMs,
          data,
        });
      }

      return cloneData(data as T);
    };

    if (method === "GET") {
      const pendingRequest = executeRequest()
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error("คำขอใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง");
          }
          throw error;
        })
        .finally(() => {
          inFlightRequests.delete(cacheKey);
        });

      inFlightRequests.set(cacheKey, pendingRequest);
      return pendingRequest as Promise<T>;
    }

    try {
      return await executeRequest();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("คำขอใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง");
      }
      throw error;
    }
  }

  return {
    api: {
      get: <T>(url: string) => request<T>(url),
      post: <T>(url: string, data: unknown) =>
        request<T>(url, { method: "POST", body: JSON.stringify(data) }),
      put: <T>(url: string, data: unknown) =>
        request<T>(url, { method: "PUT", body: JSON.stringify(data) }),
      patch: <T>(url: string, data?: unknown) =>
        request<T>(url, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
      delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
    },
    clearApiAuthState,
    setCachedAccessToken,
  };
}
