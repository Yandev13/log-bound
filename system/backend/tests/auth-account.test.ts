import { afterAll, describe, expect, it } from 'vitest';
import { env, newClient } from './helpers';

// These tests change and restore the password of ojt5 only. A global sign-out ends all sessions of a user,
// so no other test uses ojt5.
const EMAIL = 'ojt5@test.local';
const seedPassword = () => env('SEED_PASSWORD');
const tempPassword = () => `${env('SEED_PASSWORD')}-T`;

async function signIn(password: string) {
  return newClient().auth.signInWithPassword({ email: EMAIL, password });
}

describe('TC-U-AUTH-01 password rules (QR-SE-04)', () => {
  it('TC-U-AUTH-01 rejects a password shorter than 8 characters', async () => {
    const login = await signIn(seedPassword());
    expect(login.error).toBeNull();
    const client = newClient();
    await client.auth.setSession(login.data.session!);
    const { error } = await client.auth.updateUser({ password: 'Ab1-xyz' }); // 7 characters
    expect(error).not.toBeNull();
    expect(error?.code).toBe('weak_password');
    // The old password still works.
    expect((await signIn(seedPassword())).error).toBeNull();
  });

  it('TC-U-AUTH-01 a correct password signs in and a wrong password does not', async () => {
    expect((await signIn(seedPassword())).error).toBeNull();
    const wrong = await signIn(`${seedPassword()}x`);
    expect(wrong.error?.status).toBe(400);
    expect(wrong.data.session).toBeNull();
  });
});

describe('TC-U-AUTH-02 token settings (QR-SE-03, D-22)', () => {
  it('TC-U-AUTH-02 the access token (JWT) life is 900 seconds or less', async () => {
    const login = await signIn(seedPassword());
    const payload = JSON.parse(Buffer.from(login.data.session!.access_token.split('.')[1], 'base64url').toString());
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(900);
    expect(login.data.session!.expires_in).toBeLessThanOrEqual(900);
  });
  // Rotation and reuse detection: TC-CI-AUTH-01. The agreement of auth-settings.md with the project
  // is examined with `supabase config push` (dry run) at each gate (backend AGENTS.md).
});

describe('TC-CI-AUTH-03 logout and password change (FR-AUTH-05, FR-AUTH-06)', () => {
  afterAll(async () => {
    // Put the seed password back, also when a test failed in the middle.
    for (const pw of [tempPassword(), seedPassword()]) {
      const login = await signIn(pw);
      if (!login.error) {
        const c = newClient();
        await c.auth.setSession(login.data.session!);
        await c.auth.updateUser({ password: seedPassword() });
        await c.auth.signOut();
        return;
      }
    }
  });

  it('TC-CI-AUTH-03 logout revokes the refresh token', async () => {
    const login = await signIn(seedPassword());
    const client = newClient();
    await client.auth.setSession(login.data.session!);
    const refreshToken = login.data.session!.refresh_token;
    const { error } = await client.auth.signOut();
    expect(error).toBeNull();
    const reuse = await newClient().auth.refreshSession({ refresh_token: refreshToken });
    expect(reuse.error).not.toBeNull();
    expect(reuse.data.session).toBeNull();
  });

  it('TC-CI-AUTH-03 after a password change the new password works and the old one does not', async () => {
    const login = await signIn(seedPassword());
    const client = newClient();
    await client.auth.setSession(login.data.session!);
    expect((await client.auth.updateUser({ password: tempPassword() })).error).toBeNull();

    expect((await signIn(tempPassword())).error).toBeNull();
    expect((await signIn(seedPassword())).error?.status).toBe(400);
  });
  // The old-password check is in the client (AuthService.changePassword, frontend auth.service.spec.ts).
  // The admin reset part needs the admin-users Edge Function (S3).
});
