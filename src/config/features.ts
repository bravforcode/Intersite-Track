/// <reference types="vite/client" />

/**
 * Feature flags for incremental rollout of premium features.
 */
const appEnvironment = (
  import.meta.env.VITE_APP_ENV ||
  import.meta.env.MODE ||
  (import.meta.env.PROD ? "production" : "development")
).toLowerCase();

const isQuickLoginFlagEnabled = (import.meta.env.VITE_ENABLE_QUICK_LOGIN ?? "true").toLowerCase() !== "false";
const isQuickLoginEnvironment = import.meta.env.DEV || appEnvironment === "staging";

export const FEATURES = {
  // Phase 1
  THEME_TOGGLE: true,
  GLASSMORPHISM: true,
  CONFETTI: true,
  SKELETON_LOADING: true,

  // Phase 2
  KANBAN_VIEW: true,

  // Phase 3
  COMMENTS: false, // Requires DB migration
  ACTIVITY_LOG: false, // Requires DB migration

  // Phase 4
  DASHBOARD_REORDER: true,
  PDF_EXPORT: true,

  // Auth helpers
  QUICK_LOGIN: isQuickLoginEnvironment && isQuickLoginFlagEnabled,
};

/** Aliased shape used by components */
export const features = {
  premiumTheme: { enabled: FEATURES.THEME_TOGGLE },
  kanbanBoard: { enabled: FEATURES.KANBAN_VIEW },
  premiumConfetti: { enabled: FEATURES.CONFETTI },
  quickLogin: { enabled: FEATURES.QUICK_LOGIN, environment: appEnvironment },
};
