export interface AuthBootstrapDecisionInput {
  initialAuthResolved: boolean;
  hasFirebaseUser: boolean;
  hasStoredUser: boolean;
  hasInMemoryUser: boolean;
  profileRequestInFlight: boolean;
}

export type AuthBootstrapDecision =
  | "clear-session"
  | "reuse-stored-user"
  | "fetch-profile"
  | "noop";

export function resolveAuthBootstrapDecision(
  input: AuthBootstrapDecisionInput
): AuthBootstrapDecision {
  if (!input.hasFirebaseUser) {
    return "clear-session";
  }

  if (input.initialAuthResolved) {
    return "noop";
  }

  if (input.hasStoredUser || input.hasInMemoryUser) {
    return "reuse-stored-user";
  }

  if (input.profileRequestInFlight) {
    return "noop";
  }

  return "fetch-profile";
}
