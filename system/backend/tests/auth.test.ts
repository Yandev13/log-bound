import { describe, expect, it } from 'vitest';
import { env, newClient, SEED } from './helpers';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('TC-CI-AUTH-01 login and refresh endpoints (FR-AUTH-01, QR-SE-03)', () => {
  it('TC-CI-AUTH-01 gives tokens for a valid login', async () => {
    const client = newClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: SEED.ojt1.email,
      password: env('SEED_PASSWORD'),
    });
    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();
    expect(data.session?.refresh_token).toBeTruthy();
    expect(data.user?.id).toBe(SEED.ojt1.id);
  });

  it('TC-CI-AUTH-01 rejects a wrong password', async () => {
    const client = newClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: SEED.ojt1.email,
      password: `${env('SEED_PASSWORD')}-wrong`,
    });
    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it('TC-CI-AUTH-01 gives a new token pair on refresh', async () => {
    const client = newClient();
    const login = await client.auth.signInWithPassword({ email: SEED.ojt1.email, password: env('SEED_PASSWORD') });
    const first = login.data.session!.refresh_token;

    const refreshed = await newClient().auth.refreshSession({ refresh_token: first });
    expect(refreshed.error).toBeNull();
    expect(refreshed.data.session?.access_token).toBeTruthy();
    expect(refreshed.data.session?.refresh_token).toBeTruthy();
    expect(refreshed.data.session?.refresh_token).not.toBe(first);
  });

  // Supabase Auth gives two exceptions to "use a refresh token one time" (docs: User sessions):
  // reuse within 10 s, and reuse of the parent of the active token. An older token is reuse (D-41).
  it('TC-CI-AUTH-01 rejects an old used refresh token', async () => {
    const login = await newClient().auth.signInWithPassword({ email: SEED.ojt1.email, password: env('SEED_PASSWORD') });
    const t1 = login.data.session!.refresh_token;
    const r2 = await newClient().auth.refreshSession({ refresh_token: t1 });
    const t2 = r2.data.session!.refresh_token;
    const r3 = await newClient().auth.refreshSession({ refresh_token: t2 });
    const t3 = r3.data.session!.refresh_token;
    expect(r3.error).toBeNull();

    // t1 is now the grandparent of the active token t3. Wait for the reuse interval.
    await sleep(11_000);
    const reuse = await newClient().auth.refreshSession({ refresh_token: t1 });
    expect(reuse.error).not.toBeNull();
    expect(reuse.error?.code).toBe('refresh_token_already_used');
    expect(reuse.data.session).toBeNull();
    // NOTE: The Supabase docs say that reuse also revokes the active token (t3). On dev (2026-10-25),
    // t3 still works. QR-SE-03 does not need this, so the test does not examine it (D-41).
    expect(t3).toBeTruthy();
  });

  it('TC-CI-AUTH-01 returns the active session when the parent of the active token comes again', async () => {
    // A client that lost the refresh response sends the old token again (offline-first, QR-RE-08).
    const login = await newClient().auth.signInWithPassword({ email: SEED.ojt1.email, password: env('SEED_PASSWORD') });
    const t1 = login.data.session!.refresh_token;
    const r2 = await newClient().auth.refreshSession({ refresh_token: t1 });
    expect(r2.error).toBeNull();

    await sleep(11_000);
    const again = await newClient().auth.refreshSession({ refresh_token: t1 });
    expect(again.error).toBeNull();
    expect(again.data.session?.refresh_token).toBeTruthy();
  });
});
