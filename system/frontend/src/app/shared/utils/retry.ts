// Layer 0: retry delays after a failed sync request (offline sync design, section 6; FR-SYNC-02).

/** 5 s, 15 s, 60 s, then 5 minutes for each next attempt. */
export const RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 60_000, 300_000];

/** The delay before the next attempt, after `failures` failed attempts in a row (1 or more). */
export function retryDelayMs(failures: number): number {
  const index = Math.min(Math.max(failures, 1), RETRY_DELAYS_MS.length) - 1;
  return RETRY_DELAYS_MS[index];
}
