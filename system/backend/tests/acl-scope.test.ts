// L2 tests of the read scope of assignments and the device records (QR-SE-01).
// Seed: ojt1 to ojt5 go to fac1, ojt6 goes to fac2.
// NOTE: Device records cannot be deleted through the API. Each run leaves one `devices` row of ojt1 on dev.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SEED, signedIn } from './helpers';

let ojt1: SupabaseClient;
let ojt6: SupabaseClient;
let fac1: SupabaseClient;
let admin: SupabaseClient;

beforeAll(async () => {
  [ojt1, ojt6, fac1, admin] = await Promise.all(
    [SEED.ojt1.email, SEED.ojt6.email, SEED.fac1.email, SEED.admin.email].map((e) => signedIn(e)),
  );
});

afterAll(async () => {
  await Promise.all([ojt1, ojt6, fac1, admin].map((c) => c?.auth.signOut({ scope: 'local' })));
});

describe('TC-CI-ACL-01 OJT data scope (assignments and devices)', () => {
  it('TC-CI-ACL-01: an OJT reads only its own assignment', async () => {
    const { data, error } = await ojt1.from('ojt_assignments').select('ojt_id');
    expect(error).toBeNull();
    expect(data).toEqual([{ ojt_id: SEED.ojt1.id }]);
  });

  describe('device records', () => {
    const deviceId = randomUUID();

    it('TC-CI-ACL-01: an OJT adds, reads, and changes its own device record', async () => {
      const ins = await ojt1
        .from('devices')
        .insert({ id: deviceId, user_id: SEED.ojt1.id, platform: 'android', push_token: 'l2-test-token-1' })
        .select('id');
      expect(ins.error).toBeNull();
      expect(ins.data).toHaveLength(1);

      const upd = await ojt1.from('devices').update({ push_token: 'l2-test-token-2' }).eq('id', deviceId).select('push_token');
      expect(upd.error).toBeNull();
      expect(upd.data).toEqual([{ push_token: 'l2-test-token-2' }]);
    });

    it('TC-CI-ACL-01: another OJT cannot read, change, or add a device record of ojt1', async () => {
      const read = await ojt6.from('devices').select('id').eq('id', deviceId);
      expect(read.error).toBeNull();
      expect(read.data).toEqual([]);

      const upd = await ojt6.from('devices').update({ push_token: 'forged' }).eq('id', deviceId).select();
      expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);

      const ins = await ojt6.from('devices').insert({ user_id: SEED.ojt1.id, platform: 'android' });
      expect(ins.error).not.toBeNull();

      const own = await ojt1.from('devices').select('push_token').eq('id', deviceId).single();
      expect(own.data).toEqual({ push_token: 'l2-test-token-2' });
    });

    it('TC-CI-ACL-01: the admin cannot add a device record (mobile roles only)', async () => {
      const { error } = await admin.from('devices').insert({ user_id: SEED.admin.id, platform: 'web' });
      expect(error).not.toBeNull();
    });
  });
});

describe('TC-CI-ACL-02 facilitator data scope (assignments part)', () => {
  it('TC-CI-ACL-02: fac1 reads only the assignments where it is the facilitator', async () => {
    const { data, error } = await fac1.from('ojt_assignments').select('ojt_id, facilitator_id');
    expect(error).toBeNull();
    const rows = data ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.facilitator_id === SEED.fac1.id)).toBe(true);
    expect(rows.map((r) => r.ojt_id)).toContain(SEED.ojt1.id);
    expect(rows.map((r) => r.ojt_id)).not.toContain(SEED.ojt6.id);
  });
});
