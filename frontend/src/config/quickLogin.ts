export interface QuickLoginAccount {
  role: "admin" | "staff";
  label: string;
  subtitle: string;
  email: string;
  password?: string;
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

const defaultQuickLoginAccounts: QuickLoginAccount[] = [
  {
    role: "admin",
    label: "แอดมิน (Admin)",
    subtitle: "admin@taskam.local",
    email: "admin@taskam.local",
  },
  {
    role: "staff",
    label: "พนักงาน (Staff)",
    subtitle: "somchai@taskam.local",
    email: "somchai@taskam.local",
  },
];

export function buildQuickLoginAccounts(env: QuickLoginEnv): QuickLoginAccount[] {
  const accountDefinitions = [
    {
      role: "admin" as const,
      defaultLabel: "แอดมิน (Admin)",
      label: env.VITE_QUICK_LOGIN_ADMIN_LABEL,
      subtitle: env.VITE_QUICK_LOGIN_ADMIN_SUBTITLE,
      email: env.VITE_QUICK_LOGIN_ADMIN_EMAIL,
      password: env.VITE_QUICK_LOGIN_ADMIN_PASSWORD,
    },
    {
      role: "staff" as const,
      defaultLabel: "พนักงาน (Staff)",
      label: env.VITE_QUICK_LOGIN_STAFF_LABEL,
      subtitle: env.VITE_QUICK_LOGIN_STAFF_SUBTITLE,
      email: env.VITE_QUICK_LOGIN_STAFF_EMAIL,
      password: env.VITE_QUICK_LOGIN_STAFF_PASSWORD,
    },
  ];

  const configuredAccounts = accountDefinitions.flatMap((accountDefinition) => {
    const email = normalizeValue(accountDefinition.email)?.toLowerCase() ?? null;
    const password = normalizeValue(accountDefinition.password);

    if (!email || !password) {
      return [];
    }

    return [{
      role: accountDefinition.role,
      label: normalizeValue(accountDefinition.label) ?? accountDefinition.defaultLabel,
      subtitle: normalizeValue(accountDefinition.subtitle) ?? email,
      email,
      password,
    }];
  });

  return configuredAccounts.length > 0 ? configuredAccounts : defaultQuickLoginAccounts;
}

export function isQuickLoginEnabled(params: {
  flagEnabled: boolean;
  accountCount: number;
}): boolean {
  return params.flagEnabled && params.accountCount > 0;
}
