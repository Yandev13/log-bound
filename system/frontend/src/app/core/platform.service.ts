import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

/** `mobile` is the Android or iOS app (OJT, facilitator). `web` is the admin web app. */
export type AppPlatform = 'mobile' | 'web';

/** Finds the platform one time. Other code asks this service, not Capacitor (frontend rule 5). */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  readonly platform: AppPlatform =
    environment.platformOverride ?? (Capacitor.isNativePlatform() ? 'mobile' : 'web');
}
