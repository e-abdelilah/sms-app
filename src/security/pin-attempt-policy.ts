/** Demonstration policy for the in-memory Phase 3 PIN limiter. These values are not secrets. */
export const MAX_PIN_FAILED_ATTEMPTS = 5;
export const PIN_RETRY_DELAY_MS = 1_000;
export const TEMPORARY_PIN_LOCK_MS = 30_000;

export function getAttemptsRemaining(failedAttempts: number) {
  return Math.max(0, MAX_PIN_FAILED_ATTEMPTS - Math.max(0, failedAttempts));
}

export function getDurationInSeconds(durationMs: number) {
  return Math.ceil(Math.max(0, durationMs) / 1_000);
}
