// Layer 1: the fetch function of the Supabase client.
// 1. Each request has a time limit (S1 observation O-5). A request that does not finish in time fails
//    as a network error. Then the app shows "Server not reachable" (FR-SYNC-08) and keeps the session (QR-RE-08).
// 2. Test builds can add network faults (fault injector, D-20; TC-SI-SYNC-02, TC-SI-SYNC-06).

export type FetchFn = typeof fetch;

/** The time limit of one request. Login and sync requests are small. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** True when the WebView knows that the device has no network (for example, airplane mode). */
const browserOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * Gives a fetch that stops each request after `timeoutMs`. The caller's own abort signal still works.
 * With no network, a request fails at once. Else an offline logout waits for the full time limit (DEF-014).
 */
export function withTimeout(base: FetchFn, timeoutMs: number = REQUEST_TIMEOUT_MS, offline: () => boolean = browserOffline): FetchFn {
  return (input, init) => {
    if (offline()) {
      return Promise.reject(new TypeError('No network'));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException('Request timeout', 'TimeoutError')), timeoutMs);
    const outer = init?.signal;
    if (outer) {
      if (outer.aborted) {
        controller.abort(outer.reason);
      } else {
        outer.addEventListener('abort', () => controller.abort(outer.reason), { once: true });
      }
    }
    return base(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}

/** Fault rates from 0 to 1. `drop`: the request fails as a network error. `serverError`: the response is HTTP 500. */
export interface FaultConfig {
  drop: number;
  serverError: number;
}

export const NO_FAULTS: FaultConfig = { drop: 0, serverError: 0 };

/**
 * Gives a fetch that adds faults before the real request. `config` is read at each request, so that a test
 * can change the rates while the app runs. `random` is replaceable for unit tests.
 */
export function withFaults(base: FetchFn, config: () => FaultConfig, random: () => number = Math.random): FetchFn {
  return (input, init) => {
    const { drop, serverError } = config();
    const roll = random();
    if (roll < drop) {
      return Promise.reject(new TypeError('Fault injector: request dropped'));
    }
    if (roll < drop + serverError) {
      return Promise.resolve(new Response('{"message":"Fault injector: server error"}', { status: 500 }));
    }
    return base(input, init);
  };
}
