import { useEffect, useState } from "react";
import { authService } from "../services/authService";
import { isNotificationSSEAuthFailureStatus } from "../utils/notificationSse";

export interface NotificationPayload {
  event: string;
  title?: string;
  message?: string;
  type?: string;
  reference_id?: string;
  created_at?: string;
}

export function useNotificationSSE(enabled = true) {
  const [latestNotification, setLatestNotification] = useState<NotificationPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setToken(null);
      return;
    }

    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        setToken(null);
        return;
      }

      void firebaseUser
        .getIdToken()
        .then(setToken)
        .catch(() => setToken(null));
    });

    return () => unsubscribe();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !token) return;

    const apiUrl = import.meta.env.VITE_API_URL || "/api";
    const controller = new AbortController();
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let activeToken = token;

    const handleEvent = (payload: string) => {
      if (!payload.trim()) return;

      try {
        const data = JSON.parse(payload) as NotificationPayload & { userId?: string };
        if (data.event === "notification") {
          setLatestNotification(data);
        }
      } catch {
        // Ignore malformed or partial SSE payloads.
      }
    };

    const consumeStream = async () => {
      while (!cancelled) {
        try {
          const response = await fetch(`${apiUrl}/notifications/stream`, {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
            signal: controller.signal,
          });

          if (isNotificationSSEAuthFailureStatus(response.status)) {
            const refreshedToken = await authService.getToken(true);
            if (!cancelled && refreshedToken && refreshedToken !== activeToken) {
              activeToken = refreshedToken;
              setToken(refreshedToken);
              continue;
            }

            setToken(null);
            if (import.meta.env.DEV) {
              console.warn("[SSE] Authentication failed; realtime notifications paused.");
            }
            break;
          }

          if (!response.ok || !response.body) {
            throw new Error(`SSE connection failed with status ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!cancelled) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let separatorIndex = buffer.indexOf("\n\n");

            while (separatorIndex !== -1) {
              const eventBlock = buffer.slice(0, separatorIndex);
              buffer = buffer.slice(separatorIndex + 2);
              separatorIndex = buffer.indexOf("\n\n");

              const data = eventBlock
                .split("\n")
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trimStart())
                .join("\n");

              handleEvent(data);
            }
          }
        } catch (error) {
          if (cancelled || (error instanceof Error && error.name === "AbortError")) {
            break;
          }

          if (import.meta.env.DEV) {
            console.warn("[SSE] Error, reconnecting...", error);
          }
        }

        if (!cancelled) {
          await new Promise<void>((resolve) => {
            reconnectTimer = setTimeout(resolve, 3000);
          });
        }
      }
    };

    void consumeStream();

    return () => {
      cancelled = true;
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [enabled, token]);

  return { latestNotification };
}
