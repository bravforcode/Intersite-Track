export interface QuickLoginAccount {
  label: string;
  subtitle: string;
  email: string;
  password: string;
}

interface QuickLoginEnv {
  VITE_QUICK_LOGIN_ADMIN_LABEL?: string;
  VITE_QUICK_LOGIN_ADMIN_SUBTITLE?: string;
  VITE_QUICK_LOGIN_ADMIN_EMAIL?: string;
  VITE_QUICK_LOGIN_ADMIN_PASSWORD?: string;
  VITE_QUICK_LOGIN_STAFF_LABEL?: string;
  VITE_QUICK_LOGIN_STAFF_SUBTITLE?: string;
  VITE_QUICK_LOGIN_STAFF_EMAIL?: string;
  VITE_QUICK_LOGIN_STAFF_PASSWORD?: string;
}

function normalizeValue(value?: string): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildQuickLoginAccounts(env: QuickLoginEnv): QuickLoginAccount[] {
  const accountDefinitions = [
    {
      defaultLabel: "แอดมิน (Admin)",
      label: env.VITE_QUICK_LOGIN_ADMIN_LABEL,
      subtitle: env.VITE_QUICK_LOGIN_ADMIN_SUBTITLE,
      email: env.VITE_QUICK_LOGIN_ADMIN_EMAIL,
      password: env.VITE_QUICK_LOGIN_ADMIN_PASSWORD,
    },
    {
      defaultLabel: "พนักงาน (Staff)",
      label: env.VITE_QUICK_LOGIN_STAFF_LABEL,
      subtitle: env.VITE_QUICK_LOGIN_STAFF_SUBTITLE,
      email: env.VITE_QUICK_LOGIN_STAFF_EMAIL,
      password: env.VITE_QUICK_LOGIN_STAFF_PASSWORD,
    },
  ];

  return accountDefinitions.flatMap((accountDefinition) => {
    const email = normalizeValue(accountDefinition.email)?.toLowerCase() ?? null;
    const password = normalizeValue(accountDefinition.password);

    if (!email || !password) {
      return [];
    }

    return [{
      label: normalizeValue(accountDefinition.label) ?? accountDefinition.defaultLabel,
      subtitle: normalizeValue(accountDefinition.subtitle) ?? email,
      email,
      password,
    }];
  });
}

export function isQuickLoginEnabled(params: {
  appEnvironment: string;
  flagEnabled: boolean;
  accountCount: number;
}): boolean {
  const allowedEnvironments = new Set(["development", "staging"]);
  return allowedEnvironments.has(params.appEnvironment) && params.flagEnabled && params.accountCount > 0;
}
