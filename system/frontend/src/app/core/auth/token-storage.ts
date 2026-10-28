// Storage for the Supabase session (QR-SE-03, frontend rule 8, D-42).
// Mobile: the secure storage plugin (Android Keystore, iOS Keychain).
// Web (admin): sessionStorage. The tab close removes the tokens. Never localStorage.
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { AppPlatform } from '../platform.service';

/** The storage interface that supabase-js uses (`auth.storage`). */
export interface AuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class SecureAuthStorage implements AuthStorage {
  getItem(key: string): Promise<string | null> {
    return SecureStorage.getItem(key);
  }
  setItem(key: string, value: string): Promise<void> {
    return SecureStorage.setItem(key, value);
  }
  removeItem(key: string): Promise<void> {
    return SecureStorage.removeItem(key);
  }
}

export class SessionAuthStorage implements AuthStorage {
  async getItem(key: string): Promise<string | null> {
    return window.sessionStorage.getItem(key);
  }
  async setItem(key: string, value: string): Promise<void> {
    window.sessionStorage.setItem(key, value);
  }
  async removeItem(key: string): Promise<void> {
    window.sessionStorage.removeItem(key);
  }
}

/**
 * DEF-012 (QR-RE-08, QR-SF-02): supabase-js keeps the server `expires_at` and compares it with the device clock.
 * With a device clock that is wrong by more than the token life, each new token looks expired, and a failed
 * refresh then removes the session. This wrapper stores `expires_at` as device time now + `expires_in`, so the
 * expiry check uses only the device clock. The server still checks the real expiry.
 */
export class DeviceClockExpiry implements AuthStorage {
  constructor(
    private readonly inner: AuthStorage,
    private readonly nowMs: () => number = Date.now,
  ) {}

  getItem(key: string): Promise<string | null> {
    return this.inner.getItem(key);
  }

  setItem(key: string, value: string): Promise<void> {
    return this.inner.setItem(key, withDeviceExpiry(value, this.nowMs()));
  }

  removeItem(key: string): Promise<void> {
    return this.inner.removeItem(key);
  }
}

/** A session JSON gets a device-time `expires_at`. Other values do not change. */
export function withDeviceExpiry(value: string, nowMs: number): string {
  let data: unknown;
  try {
    data = JSON.parse(value);
  } catch {
    return value;
  }
  if (!data || typeof data !== 'object') {
    return value;
  }
  const session = data as Record<string, unknown>;
  if (typeof session['access_token'] !== 'string' || typeof session['expires_in'] !== 'number') {
    return value;
  }
  return JSON.stringify({ ...session, expires_at: Math.floor(nowMs / 1000) + session['expires_in'] });
}

export function authStorageFor(platform: AppPlatform): AuthStorage {
  return new DeviceClockExpiry(platform === 'mobile' ? new SecureAuthStorage() : new SessionAuthStorage());
}
