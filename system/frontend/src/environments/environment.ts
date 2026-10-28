// Development settings. `ng build` replaces this file with `environment.prod.ts`.
import type { AppPlatform } from '../app/core/platform.service';

export const environment = {
  production: false,
  // Supabase project `ojt-dtr-dev`. The publishable key is public by design. RLS protects the data.
  supabaseUrl: 'https://bclcgckflztfyxqaqvqt.supabase.co',
  supabaseKey: 'sb_publishable_UT6bIX3kMHBi_pND9NKlrw_f8HH_zZg',
  // Set 'mobile' to test the OJT and facilitator screens with `ionic serve` in a browser.
  // null: the app finds the platform (native app = mobile, browser = web).
  platformOverride: 'mobile' as AppPlatform | null,
  // Test builds: `window.ojtFaults.set({ drop, serverError })` adds network faults (D-20). Rates are 0 by default.
  faultInjection: true,
};
