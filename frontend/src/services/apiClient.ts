type Session = {
  access_token?: string;
} | null;

type SessionResponse = {
  data: {
    session: Session;
  };
};

export interface AuthSessionClientLike {
  auth: {
    getSession: () => Promise<SessionResponse>;
    signOut: (options: { scope: "local" }) => Promise<unknown>;
  };
}

type StorageLike = Pick<Storage, "getItem" | "removeItem">;
type LocationLike = Pick<Location, "href">;

export interface ApiClientDependencies {
  authClient: AuthSessionClientLike;
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
  setCachedCsrfToken: (token: string | null) => void;
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
  authClient,
  baseUrl = "",
  cacheTtlMs = 1500,
  requestTimeoutMs = 30_000,
  fetchFn = globalThis.fetch.bind(globalThis),
  storage = globalThis.sessionStorage,
  location = globalThis.location,
  now = Date.now,
  setTimeoutFn = globalThis.setTimeout.bind(globalThis),
  clearTimeoutFn = globalThis.clearTimeout.bind(globalThis),
}: ApiClientDependencies): ApiClientInstance {
  const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
  const inFlightRequests = new Map<string, Promise<unknown>>();
  let cachedAccessToken: string | null = null;
  let pendingAccessTokenPromise: Promise<string | null> | null = null;
  let cachedCsrfToken: string | null = null;
  let cachedCsrfTokenScope: string | null = null;
  let pendingCsrfTokenPromise: Promise<string | null> | null = null;

  function setCachedAccessToken(token: string | null): void {
    if (cachedAccessToken !== token) {
      cachedCsrfToken = null;
      cachedCsrfTokenScope = null;
      pendingCsrfTokenPromise = null;
    }
    cachedAccessToken = token;
  }

  function setCachedCsrfToken(token: string | null): void {
    cachedCsrfToken = token;
    cachedCsrfTokenScope = token ? (cachedAccessToken ?? "anonymous") : null;
  }

  function clearApiAuthState(): void {
    cachedAccessToken = null;
    pendingAccessTokenPromise = null;
    cachedCsrfToken = null;
    cachedCsrfTokenScope = null;
    pendingCsrfTokenPromise = null;
    responseCache.clear();
    inFlightRequests.clear();
  }

  async function getToken(): Promise<string | null> {
    if (cachedAccessToken) return cachedAccessToken;
    if (pendingAccessTokenPromise) return pendingAccessTokenPromise;

    pendingAccessTokenPromise = authClient.auth
      .getSession()
      .then(({ data }) => {
        cachedAccessToken = data.session?.access_token ?? null;
        return cachedAccessToken;
      })
      .finally(() => {
        pendingAccessTokenPromise = null;
      });

    return pendingAccessTokenPromise;
  }

  async function getCsrfToken(forceRefresh = false, authToken: string | null = null): Promise<string | null> {
    const csrfScope = authToken ?? "anonymous";
    if (!forceRefresh && cachedCsrfToken && cachedCsrfTokenScope === csrfScope) return cachedCsrfToken;
    if (!forceRefresh && pendingCsrfTokenPromise) return pendingCsrfTokenPromise;

    const headers = new Headers();
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

    pendingCsrfTokenPromise = fetchFn(`${baseUrl}/api/csrf-token`, {
      method: "GET",
      headers,
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("ไม่สามารถเริ่มเซสชันความปลอดภัยได้");
        }

        const headerToken = response.headers.get("X-CSRF-Token");
        const payload = await response.json().catch(() => ({}));
        cachedCsrfToken = headerToken ?? payload.csrfToken ?? null;
        cachedCsrfTokenScope = cachedCsrfToken ? csrfScope : null;

        if (!cachedCsrfToken) {
          throw new Error("เซิร์ฟเวอร์ไม่ได้ส่ง CSRF token กลับมา");
        }

        return cachedCsrfToken;
      })
      .finally(() => {
        pendingCsrfTokenPromise = null;
      });

    return pendingCsrfTokenPromise;
  }

  async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const token = await getToken();
    const cacheKey = `${method}:${endpoint}:${token ?? "guest"}`;
    const requiresCsrf = !["GET", "HEAD", "OPTIONS"].includes(method) && endpoint !== "/api/csrf-token";

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

    const executeRequest = async (csrfRetry = false): Promise<T> => {
      const headers = new Headers(options.headers);
      if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      if (requiresCsrf) {
        const csrfToken = await getCsrfToken(csrfRetry, token);
        if (csrfToken) {
          headers.set("x-csrf-token", csrfToken);
        }
      }

      const controller = new AbortController();
      const timeout = setTimeoutFn(() => controller.abort(), requestTimeoutMs);

      const res = await fetchFn(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
        credentials: "include",
      }).finally(() => {
        clearTimeoutFn(timeout);
      });

      if (res.status === 401) {
        clearApiAuthState();
        await authClient.auth.signOut({ scope: "local" }).catch(() => {});
        storage.removeItem("user");
        location.href = "/";
        throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "เกิดข้อผิดพลาด" }));
        const errorMessage = typeof err.error === "string" ? err.error : "เกิดข้อผิดพลาด";
        if (res.status === 403 && requiresCsrf && !csrfRetry && /csrf/i.test(errorMessage)) {
          cachedCsrfToken = null;
          return executeRequest(true);
        }
        const detail = typeof err.detail === "string" && err.detail ? ` (${err.detail})` : "";
        throw new Error(errorMessage + detail);
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
    setCachedCsrfToken,
  };
}
