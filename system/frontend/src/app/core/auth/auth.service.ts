// Login, session restore, and logout (FR-AUTH-01 to FR-AUTH-03, FR-AUTH-05).
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthError } from '@supabase/supabase-js';
import { Profile, ProfileRepository } from '../../data/repositories/profile.repository';
import { PlatformService } from '../platform.service';
import { SUPABASE } from '../supabase.client';
import { Role, homePath, roleAllowedOn } from './access';

export type SignInFailure =
  | 'invalid-credentials'
  | 'rate-limited'
  | 'network'
  | 'wrong-platform'
  | 'inactive'
  | 'unknown';

export type SignInResult = { ok: true; home: string } | { ok: false; reason: SignInFailure };

export type PasswordChangeResult =
  | { ok: true }
  | { ok: false; reason: 'wrong-old-password' | 'weak-password' | 'not-signed-in' | 'network' | 'unknown' };

/** Maps a Supabase Auth error to a cause that the login page can show (QR-IC-04). */
export function signInFailureOf(error: AuthError): SignInFailure {
  if (error.status === 429) {
    return 'rate-limited';
  }
  if (error.status === 400 || error.code === 'invalid_credentials') {
    return 'invalid-credentials';
  }
  if (!error.status || error.name === 'AuthRetryableFetchError') {
    return 'network';
  }
  return 'unknown';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE);
  private readonly profiles = inject(ProfileRepository);
  private readonly platform = inject(PlatformService).platform;

  private readonly profileState = signal<Profile | null>(null);
  readonly profile = this.profileState.asReadonly();
  readonly role = computed<Role | null>(() => this.profileState()?.role ?? null);

  private restoreTask: Promise<void> | null = null;

  /** Completes when the stored session is examined. Guards wait for it. */
  ready(): Promise<void> {
    this.restoreTask ??= this.restore();
    return this.restoreTask;
  }

  async signIn(email: string, password: string): Promise<SignInResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      return { ok: false, reason: error ? signInFailureOf(error) : 'unknown' };
    }

    let profile: Profile | null;
    try {
      profile = await this.profiles.fetchById(data.user.id);
    } catch {
      // The login worked, but the profile did not load. Do not keep a session without a role.
      await this.endSession();
      return { ok: false, reason: 'network' };
    }

    if (!profile || profile.status !== 'active') {
      await this.endSession();
      return { ok: false, reason: 'inactive' };
    }
    // D-38: the client enforces the platform restriction. Sign out at once and keep no data.
    if (!roleAllowedOn(profile.role, this.platform)) {
      await this.endSession();
      return { ok: false, reason: 'wrong-platform' };
    }

    this.profileState.set(profile);
    try {
      await this.profiles.cacheLocal(profile);
    } catch {
      // The login still works. Only the offline open (FR-AUTH-04) needs the local copy.
    }
    return { ok: true, home: homePath(profile.role) };
  }

  /**
   * FR-AUTH-06. Supabase Auth does not ask for the old password, so the client examines it first
   * with a sign-in (TC-CI-AUTH-03). The server rejects a password shorter than 8 characters (QR-SE-04).
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<PasswordChangeResult> {
    const { data } = await this.supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) {
      return { ok: false, reason: 'not-signed-in' };
    }
    const check = await this.supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (check.error) {
      const cause = signInFailureOf(check.error);
      return { ok: false, reason: cause === 'invalid-credentials' ? 'wrong-old-password' : cause === 'network' ? 'network' : 'unknown' };
    }
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { ok: false, reason: error.code === 'weak_password' || error.status === 422 ? 'weak-password' : 'unknown' };
    }
    return { ok: true };
  }

  /** FR-AUTH-05. S2 adds the CAUTION with the count of unsynced changes (QR-SF-01). */
  async signOut(): Promise<void> {
    await this.endSession();
  }

  private async endSession(): Promise<void> {
    this.profileState.set(null);
    // supabase-js removes the local session also when the server call fails (offline sign-out, QR-SE-03).
    await this.supabase.auth.signOut();
  }

  private async restore(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      return;
    }
    // FR-AUTH-04 (DEF-016): open from the local profile at once. The server check runs after it. Else an
    // offline start waits for the retries of the profile request (about 7 s).
    const local = await this.profiles.getLocal(userId).catch(() => null);
    if (local && local.status === 'active' && roleAllowedOn(local.role, this.platform)) {
      this.profileState.set(local);
      void this.checkServerProfile(userId);
      return;
    }
    await this.checkServerProfile(userId);
  }

  /** The server copy of the profile wins. An inactive account or a wrong platform ends the session. */
  private async checkServerProfile(userId: string): Promise<void> {
    try {
      const profile = await this.profiles.fetchById(userId);
      if (profile && profile.status === 'active' && roleAllowedOn(profile.role, this.platform)) {
        this.profileState.set(profile);
      } else {
        await this.endSession();
      }
    } catch {
      // Network or server error: keep the session (frontend rule 12, QR-RE-08).
      // Use the local copy of the profile, so that the app opens offline (FR-AUTH-04).
      const cached = await this.profiles.getLocal(userId).catch(() => null);
      if (cached && cached.status === 'active' && roleAllowedOn(cached.role, this.platform)) {
        this.profileState.set(cached);
      }
    }
  }
}
