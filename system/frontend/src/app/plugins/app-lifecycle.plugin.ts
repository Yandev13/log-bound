// Layer 1: wrapper of @capacitor/app (frontend rule 5). The sync starts when the app comes back
// to the foreground (FR-SYNC-02).
import { InjectionToken } from '@angular/core';
import { App } from '@capacitor/app';

export interface AppLifecyclePort {
  /** Calls `listener` each time the app comes to the foreground. Gives a function that stops the listener. */
  onResume(listener: () => void): Promise<() => void>;
}

export const APP_LIFECYCLE = new InjectionToken<AppLifecyclePort>('APP_LIFECYCLE', {
  providedIn: 'root',
  factory: () => ({
    async onResume(listener: () => void) {
      const handle = await App.addListener('resume', listener);
      return () => void handle.remove();
    },
  }),
});
