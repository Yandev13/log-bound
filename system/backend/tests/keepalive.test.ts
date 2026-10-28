// L2 tests of the keep-alive functions (runbook, section 3.1; QR-RE-06).
// TC-ST-Q-RE-05 reads heartbeat_status at each gate. These tests make sure that the functions operate.
// NOTE: Each run adds one heartbeat row with the source `l2-test`. The heartbeat removes rows older than 30 days.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env, newClient, SEED, signedIn } from './helpers';

const SOURCE = 'l2-test';

let admin: SupabaseClient;
let ojt1: SupabaseClient;

beforeAll(async () => {
  [admin, ojt1] = await Promise.all([signedIn(SEED.admin.email), signedIn(SEED.ojt1.email)]);
});

afterAll(async () => {
  await Promise.all([admin, ojt1].map((c) => c?.auth.signOut({ scope: 'local' })));
});

describe('TC-ST-Q-RE-05 keep-alive functions (QR-RE-06)', () => {
  it('TC-ST-Q-RE-05: a heartbeat with the secret writes a row that heartbeat_status shows to the admin', async () => {
    const beat = await newClient().rpc('heartbeat', { source: SOURCE, secret: env('KEEPALIVE_SECRET') });
    expect(beat.error).toBeNull();
    const written = new Date(beat.data as string).getTime();

    const status = await admin.rpc('heartbeat_status');
    expect(status.error).toBeNull();
    const row = (status.data as { source: string; last_at: string }[]).find((r) => r.source === SOURCE);
    expect(row).toBeDefined();
    expect(new Date(row!.last_at).getTime()).toBe(written);
  });

  it('TC-ST-Q-RE-05: a heartbeat with a wrong secret or an invalid source is refused', async () => {
    const wrong = await newClient().rpc('heartbeat', { source: SOURCE, secret: 'wrong-secret' });
    expect(wrong.error).not.toBeNull();
    const badSource = await newClient().rpc('heartbeat', { source: 'bad source!', secret: env('KEEPALIVE_SECRET') });
    expect(badSource.error).not.toBeNull();
  });

  it('TC-ST-Q-RE-05: heartbeat_status gives zero rows to a user that is not the admin', async () => {
    const { data, error } = await ojt1.rpc('heartbeat_status');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
