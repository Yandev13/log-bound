// The one Supabase client of the app (frontend rule 11).
// Pages and components must not use it. They use a repository or a core service (frontend rule 3).
import { InjectionToken, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { authStorageFor } from './auth/token-storage';
import { FaultConfig, NO_FAULTS, withFaults, withTimeout } from './http/fetch-wrapper';
import { PlatformService } from './platform.service';

/** The fault rates of a test build (D-20). Device tests set them with `window.ojtFaults.set(...)`. */
let faults: FaultConfig = NO_FAULTS;

function clientFetch(): typeof fetch {
  const timed = withTimeout(fetch.bind(globalThis));
  if (!environment.faultInjection) {
    return timed;
  }
  (globalThis as { ojtFaults?: unknown }).ojtFaults = {
    set: (config: FaultConfig) => (faults = config),
    get: () => faults,
  };
  return withFaults(timed, () => faults);
}

export const SUPABASE = new InjectionToken<SupabaseClient>('SUPABASE', {
  providedIn: 'root',
  factory: () =>
    createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        storage: authStorageFor(inject(PlatformService).platform),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: { fetch: clientFetch() },
    }),
});
