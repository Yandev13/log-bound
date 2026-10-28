// Layer 1: wrapper of @capacitor/geolocation (frontend rule 5; FR-DTR-04).
// A punch never waits for a location that cannot come. Denied permission, no position, and the time limit
// all give null, and the punch is saved without a location (QR-SF-05, D-48).
import { InjectionToken } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

export interface Location {
  lat: number;
  lng: number;
  accuracyM: number;
}

export interface GeolocationPort {
  /** Asks for the permission if necessary. The DTR page calls it when it opens, so that a punch does not wait for the prompt. */
  prepare(): Promise<void>;
  /** Gives the position, or null after `timeoutMs`. A position up to `maxAgeMs` old is accepted. */
  currentLocation(timeoutMs: number, maxAgeMs: number): Promise<Location | null>;
}

/** Gives null when `ms` ends before the promise, or when the promise fails. */
function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

async function locate(timeoutMs: number, maxAgeMs: number): Promise<Location | null> {
  if ((await Geolocation.checkPermissions()).location !== 'granted') {
    return null;
  }
  const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: timeoutMs, maximumAge: maxAgeMs });
  return { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy };
}

export const GEOLOCATION = new InjectionToken<GeolocationPort>('GEOLOCATION', {
  providedIn: 'root',
  factory: () => ({
    async prepare() {
      try {
        const state = (await Geolocation.checkPermissions()).location;
        if (state === 'prompt' || state === 'prompt-with-rationale') {
          await Geolocation.requestPermissions({ permissions: ['location'] });
        }
      } catch {
        // No location service. Punches are saved without a location.
      }
    },
    currentLocation: (timeoutMs: number, maxAgeMs: number) => within(locate(timeoutMs, maxAgeMs), timeoutMs),
  }),
});
