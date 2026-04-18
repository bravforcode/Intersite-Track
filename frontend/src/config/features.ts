/// <reference types="vite/client" />
import { buildQuickLoginAccounts, isQuickLoginEnabled } from "./quickLogin";

/**
 * Feature flags for incremental rollout of premium features.
 */
const appEnvironment = (
  import.meta.env.VITE_APP_ENV ||
  import.meta.env.MODE ||
  (import.meta.env.PROD ? "production" : "development")
).toLowerCase();

const quickLoginAccounts = buildQuickLoginAccounts({
  VITE_QUICK_LOGIN_ADMIN_LABEL: import.meta.env.VITE_QUICK_LOGIN_ADMIN_LABEL,
  VITE_QUICK_LOGIN_ADMIN_SUBTITLE: import.meta.env.VITE_QUICK_LOGIN_ADMIN_SUBTITLE,
  VITE_QUICK_LOGIN_ADMIN_EMAIL: import.meta.env.VITE_QUICK_LOGIN_ADMIN_EMAIL,
  VITE_QUICK_LOGIN_ADMIN_PASSWORD: import.meta.env.VITE_QUICK_LOGIN_ADMIN_PASSWORD,
  VITE_QUICK_LOGIN_STAFF_LABEL: import.meta.env.VITE_QUICK_LOGIN_STAFF_LABEL,
  VITE_QUICK_LOGIN_STAFF_SUBTITLE: import.meta.env.VITE_QUICK_LOGIN_STAFF_SUBTITLE,
  VITE_QUICK_LOGIN_STAFF_EMAIL: import.meta.env.VITE_QUICK_LOGIN_STAFF_EMAIL,
  VITE_QUICK_LOGIN_STAFF_PASSWORD: import.meta.env.VITE_QUICK_LOGIN_STAFF_PASSWORD,
});

const isQuickLoginFlagEnabled = (import.meta.env.VITE_ENABLE_QUICK_LOGIN ?? "false").toLowerCase() === "true";
const isQuickLoginActive = isQuickLoginEnabled({
  flagEnabled: isQuickLoginFlagEnabled,
  accountCount: quickLoginAccounts.length,
});

export const FEATURES = {
  // Phase 1
  THEME_TOGGLE: true,
  GLASSMORPHISM: true,
  CONFETTI: true,
  SKELETON_LOADING: true,

  // Phase 2
  KANBAN_VIEW: true,
  GANTT_VIEW: true,

  // Phase 3
  COMMENTS: true,
  ACTIVITY_LOG: true,

  // Phase 4
  DASHBOARD_REORDER: true,
  PDF_EXPORT: true,

  // Auth helpers
  QUICK_LOGIN: isQuickLoginActive,
};

/** Aliased shape used by components */
export const features = {
  premiumTheme: { enabled: FEATURES.THEME_TOGGLE },
  kanbanBoard: { enabled: FEATURES.KANBAN_VIEW },
  ganttView: { enabled: FEATURES.GANTT_VIEW },
  premiumConfetti: { enabled: FEATURES.CONFETTI },
  quickLogin: { enabled: FEATURES.QUICK_LOGIN, environment: appEnvironment },
};

export { quickLoginAccounts };
