const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;

// Enforced by the API against Postgres so limits hold across stateless instances.
export const RATE_LIMITS = {
  createInvite: { limit: 10, windowSeconds: SECONDS_PER_HOUR },
  redeemAttempt: { limit: 5, windowSeconds: 10 * SECONDS_PER_MINUTE },
  // Local issuer only (AUTH_MODE=local): bounds token minting per client address.
  localTokenIssue: { limit: 120, windowSeconds: SECONDS_PER_MINUTE },
} as const;
