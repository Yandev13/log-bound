// Release settings.
// NOTE: The `prod` Supabase project does not exist yet (D-40). Until it exists, these values are the
// `dev` project. Change them to `ojt-dtr-prod` before the S5 release build.
import type { AppPlatform } from '../app/core/platform.service';

export const environment = {
  production: true,
  supabaseUrl: 'https://bclcgckflztfyxqaqvqt.supabase.co',
  supabaseKey: 'sb_publishable_UT6bIX3kMHBi_pND9NKlrw_f8HH_zZg',
  platformOverride: null as AppPlatform | null,
  // The fault injector (D-20) is for test builds only. Never true in a release build.
  faultInjection: false,
};
