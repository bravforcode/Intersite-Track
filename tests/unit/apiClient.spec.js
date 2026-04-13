import assert from "node:assert/strict";
import { test } from "node:test";

import { createApiClient } from "../../frontend/src/services/apiClient.ts";

function createStorage(initialState = {}) {
  const state = new Map(Object.entries(initialState));

  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    removeItem(key) {
      state.delete(key);
    },
    dump() {
      return Object.fromEntries(state.entries());
    },
  };
}

function createAuthClient({ accessToken = null } = {}) {
  let getSessionCalls = 0;
  let signOutCalls = 0;

  return {
    client: {
      auth: {
        getSession: async () => {
          getSessionCalls += 1;
          return {
            data: {
              session: accessToken ? { access_token: accessToken } : null,
            },
          };
        },
        signOut: async () => {
          signOutCalls += 1;
        },
      },
    },
    getSessionCalls: () => getSessionCalls,
    signOutCalls: () => signOutCalls,
  };
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

test("deduplicates concurrent GET requests and serves cached clones", async () => {
  const storage = createStorage();
  const location = { href: "/dashboard" };
  const { client: authClient, getSessionCalls } = createAuthClient({ accessToken: "session-token" });
  const payload = [{ id: 1, nested: { label: "original" } }];
  const calls = [];

  let releaseResponse = null;
  const fetchFn = (input, init = {}) => {
    calls.push({
      input,
      authorization: new Headers(init.headers).get("Authorization"),
    });

    return new Promise((resolve) => {
      releaseResponse = () => resolve(jsonResponse(payload));
    });
  };

  const { api } = createApiClient({ authClient, fetchFn, storage, location });
  const firstRequest = api.get("/api/tasks");
  const secondRequest = api.get("/api/tasks");

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].authorization, "Bearer session-token");
  assert.equal(getSessionCalls(), 1);
  assert.equal(typeof releaseResponse, "function");

  releaseResponse();

  const [first, second] = await Promise.all([firstRequest, secondRequest]);
  assert.strictEqual(first, second);

  first[0].nested.label = "changed";
  const third = await api.get("/api/tasks");

  assert.equal(calls.length, 1);
  assert.notStrictEqual(third, first);
  assert.equal(third[0].nested.label, "original");
});

test("clears cached GET data after a mutating request", async () => {
  const storage = createStorage();
  const location = { href: "/dashboard" };
  const { client: authClient } = createAuthClient({ accessToken: "session-token" });
  const calls = [];

  const fetchFn = async (input, init = {}) => {
    const method = init.method ?? "GET";
    calls.push({ input, method });

    if (calls.length === 1) {
      return jsonResponse({ total: 1 });
    }

    if (calls.length === 2) {
      assert.equal(method, "POST");
      return new Response(null, { status: 204 });
    }

    return jsonResponse({ total: 2 });
  };

  const { api } = createApiClient({ authClient, fetchFn, storage, location });

  const first = await api.get("/api/stats");
  assert.equal(first.total, 1);

  await api.post("/api/tasks", { title: "new task" });

  const second = await api.get("/api/stats");
  assert.equal(second.total, 2);
  assert.equal(calls.length, 3);
});

test("signs out locally, clears storage, and redirects on 401", async () => {
  const storage = createStorage({
    user: JSON.stringify({ token: "stored-token" }),
  });
  const location = { href: "/dashboard" };
  const { client: authClient, signOutCalls } = createAuthClient();
  const fetchFn = async () =>
    jsonResponse({ error: "unauthorized" }, { status: 401 });

  const { api, setCachedAccessToken } = createApiClient({
    authClient,
    fetchFn,
    storage,
    location,
  });

  setCachedAccessToken("cached-token");

  await assert.rejects(
    () => api.get("/api/tasks"),
    /เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่/
  );

  assert.equal(signOutCalls(), 1);
  assert.equal(location.href, "/");
  assert.deepEqual(storage.dump(), {});
});

test("translates aborted requests into the timeout message", async () => {
  const storage = createStorage();
  const location = { href: "/dashboard" };
  const { client: authClient } = createAuthClient();

  const fetchFn = (_input, init = {}) =>
    new Promise((_resolve, reject) => {
      if (init.signal.aborted) {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
        return;
      }

      init.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });

  const { api } = createApiClient({
    authClient,
    fetchFn,
    storage,
    location,
    requestTimeoutMs: 1,
    setTimeoutFn: (callback) => {
      callback();
      return 1;
    },
    clearTimeoutFn: () => {},
  });

  await assert.rejects(
    () => api.get("/api/tasks"),
    /คำขอใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง/
  );
});
