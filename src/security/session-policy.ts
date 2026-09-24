/** Session policy. These durations are public configuration, not secrets. */
export const SESSION_MAX_DURATION_MS = 5 * 60_000;
export const SESSION_INACTIVITY_TIMEOUT_MS = 2 * 60_000;
export const BACKGROUND_LOCK_DELAY_MS = 30_000;

export function getDurationInMinutes(durationMs: number) {
  return Math.ceil(durationMs / 60_000);
}

export function getDurationInSeconds(durationMs: number) {
  return Math.ceil(durationMs / 1_000);
}
