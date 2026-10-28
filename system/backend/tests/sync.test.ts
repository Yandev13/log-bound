// L2 tests of sync_push and sync_pull against dev (offline sync design, sections 4, 5, 8, 12).
// ojt4 (facilitator fac1) is the sync test account. ojt6 (facilitator fac2) is the other OJT.
// NOTE: Punches are append-only (D-05). The punches that these tests make stay on dev.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SEED, newClient, signedIn } from './helpers';

interface PushResult {
  op_id: string;
  result: 'applied' | 'duplicate' | 'conflict' | 'rejected';
  cause?: string;
  record?: Record<string, unknown> | null;
}

interface PullRecord {
  entity: string;
  change_seq: number;
  data: Record<string, unknown>;
}

interface PullResponse {
  epoch: string;
  epoch_changed: boolean;
  records: PullRecord[];
  cursor: number;
  has_more: boolean;
}

/** sync_pull holds back rows of the last 2 seconds. */
const PULL_LAG_MS = 2500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function punchPayload(ojtId: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: randomUUID(),
    ojt_id: ojtId,
    type: 'in',
    device_time: new Date().toISOString(),
    time_zone: 'Asia/Manila',
    clock_offset_s: 0,
    lat: 14.6996,
    lng: 120.9842,
    accuracy_m: 5,
    photo_id: null,
    device_id: 'l2-test-device',
    corrects_punch_id: null,
    ...over,
  };
}

function createOp(entity: string, payload: Record<string, unknown>, over: Record<string, unknown> = {}) {
  return { op_id: randomUUID(), entity, entity_id: payload['id'], op_type: 'create', payload, base_version: null, ...over };
}

async function push(client: SupabaseClient, ops: unknown[], deviceNow: Date | null = new Date()): Promise<PushResult[]> {
  const { data, error } = await client.rpc('sync_push', { p_ops: ops, p_device_now: deviceNow?.toISOString() ?? null });
  if (error) {
    throw new Error(`sync_push failed: ${error.message}`);
  }
  return (data as { results: PushResult[] }).results;
}

async function pull(client: SupabaseClient, cursor: number, epoch: string | null, limit = 500): Promise<PullResponse> {
  const { data, error } = await client.rpc('sync_pull', { p_cursor: cursor, p_epoch: epoch, p_limit: limit });
  if (error) {
    throw new Error(`sync_pull failed: ${error.message}`);
  }
  return data as PullResponse;
}

/** Pulls all pages from the cursor. */
async function pullAll(client: SupabaseClient, cursor: number, limit: number): Promise<{ records: PullRecord[]; cursor: number }> {
  const records: PullRecord[] = [];
  let epoch: string | null = null;
  for (let page = 0; page < 1000; page++) {
    const res = await pull(client, cursor, epoch, limit);
    epoch = res.epoch;
    records.push(...res.records);
    cursor = res.cursor;
    if (!res.has_more) {
      return { records, cursor };
    }
    if (res.records.length === 0) {
      await sleep(PULL_LAG_MS);
    }
  }
  throw new Error('sync_pull did not finish');
}

/** A random Monday after the year 2100, so that each run uses a new report week. */
function testWeekStart(): string {
  const monday = Date.UTC(2100, 0, 4);
  const weeks = Math.floor(Math.random() * 50_000);
  return new Date(monday + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
}

async function punchCount(client: SupabaseClient, id: string): Promise<number> {
  const { count, error } = await client.from('punches').select('id', { count: 'exact', head: true }).eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

let ojt4: SupabaseClient;
let ojt6: SupabaseClient;
let fac1: SupabaseClient;
let fac2: SupabaseClient;
let admin: SupabaseClient;

beforeAll(async () => {
  [ojt4, ojt6, fac1, fac2, admin] = await Promise.all([
    signedIn(SEED.ojt4.email),
    signedIn(SEED.ojt6.email),
    signedIn(SEED.fac1.email),
    signedIn(SEED.fac2.email),
    signedIn(SEED.admin.email),
  ]);
});

afterAll(async () => {
  await Promise.all([ojt4, ojt6, fac1, fac2, admin].map((c) => c?.auth.signOut({ scope: 'local' })));
});

describe('TC-CI-SYNC-01 idempotent push', () => {
  it('TC-CI-SYNC-01: applies an operation one time, and gives duplicate for a second send', async () => {
    const op = createOp('punches', punchPayload(SEED.ojt4.id));
    const [first] = await push(ojt4, [op]);
    expect(first.result).toBe('applied');
    expect(first.record?.['server_received_at']).toBeTruthy();
    expect(first.record?.['version']).toBe(1);

    const [second] = await push(ojt4, [op]);
    expect(second.result).toBe('duplicate');
    expect(second.record?.['id']).toBe(op.entity_id);

    // A new op_id for the same record (an epoch resend, section 12) is also a duplicate.
    const [resend] = await push(ojt4, [{ ...op, op_id: randomUUID() }]);
    expect(resend.result).toBe('duplicate');

    expect(await punchCount(ojt4, op.entity_id as string)).toBe(1);
  });

  it('TC-CI-SYNC-01: gives one result for each operation of a batch, in order', async () => {
    const ops = [createOp('punches', punchPayload(SEED.ojt4.id)), createOp('punches', punchPayload(SEED.ojt4.id, { type: 'out' }))];
    const results = await push(ojt4, ops);
    expect(results.map((r) => r.op_id)).toEqual(ops.map((o) => o.op_id));
    expect(results.map((r) => r.result)).toEqual(['applied', 'applied']);
  });
});

describe('TC-CI-SYNC-02 version conflict', () => {
  it('TC-CI-SYNC-02: an update with an old base_version gives conflict and does not change the record', async () => {
    const report = { id: randomUUID(), ojt_id: SEED.ojt4.id, week_start: testWeekStart(), tasks_done: 'v1' };
    const [created] = await push(ojt4, [createOp('weekly_reports', report)]);
    expect(created.result).toBe('applied');
    expect(created.record?.['version']).toBe(1);

    const update = (text: string, base: number) => ({
      op_id: randomUUID(), entity: 'weekly_reports', entity_id: report.id, op_type: 'update',
      payload: { tasks_done: text }, base_version: base,
    });
    const [updated] = await push(ojt4, [update('v2', 1)]);
    expect(updated.result).toBe('applied');
    expect(updated.record?.['version']).toBe(2);

    const [stale] = await push(ojt4, [update('stale', 1)]);
    expect(stale.result).toBe('conflict');
    expect(stale.record?.['version']).toBe(2);
    expect(stale.record?.['tasks_done']).toBe('v2');

    const { data } = await ojt4.from('weekly_reports').select('tasks_done, version').eq('id', report.id).single();
    expect(data).toEqual({ tasks_done: 'v2', version: 2 });
  });

  it('TC-CI-SYNC-02: a second report for the same week gives conflict', async () => {
    const week = testWeekStart();
    const a = { id: randomUUID(), ojt_id: SEED.ojt4.id, week_start: week };
    const b = { id: randomUUID(), ojt_id: SEED.ojt4.id, week_start: week };
    const [ra, rb] = await push(ojt4, [createOp('weekly_reports', a), createOp('weekly_reports', b)]);
    expect(ra.result).toBe('applied');
    expect(rb).toMatchObject({ result: 'conflict', cause: 'week_exists' });
  });
});

describe('TC-CI-SYNC-04 invalid payload', () => {
  const cases: [string, () => Record<string, unknown>, string][] = [
    ['unknown punch type', () => createOp('punches', punchPayload(SEED.ojt4.id, { type: 'lunch' })), 'invalid_data'],
    ['bad device time', () => createOp('punches', punchPayload(SEED.ojt4.id, { device_time: 'yesterday' })), 'invalid_data'],
    ['device time word "now"', () => createOp('punches', punchPayload(SEED.ojt4.id, { device_time: 'now' })), 'invalid_data'],
    ['device time "infinity"', () => createOp('punches', punchPayload(SEED.ojt4.id, { device_time: 'infinity' })), 'invalid_data'],
    ['device time without a time zone', () => createOp('punches', punchPayload(SEED.ojt4.id, { device_time: '2026-10-26T08:00:00' })), 'invalid_data'],
    ['report week word "today"', () => createOp('weekly_reports', { id: randomUUID(), ojt_id: SEED.ojt4.id, week_start: 'today' }), 'invalid_data'],
    ['latitude without longitude', () => createOp('punches', punchPayload(SEED.ojt4.id, { lng: null })), 'invalid_data'],
    ['latitude out of range', () => createOp('punches', punchPayload(SEED.ojt4.id, { lat: 95 })), 'invalid_data'],
    ['missing device ID', () => createOp('punches', punchPayload(SEED.ojt4.id, { device_id: null })), 'invalid_data'],
    ['payload ID is not the entity ID', () => createOp('punches', punchPayload(SEED.ojt4.id), { entity_id: randomUUID() }), 'invalid_data'],
    ['photo of another user', () => createOp('punches', punchPayload(SEED.ojt4.id, { photo_id: randomUUID() })), 'invalid_reference'],
    ['client correction punch', () => createOp('punches', punchPayload(SEED.ojt4.id, { corrects_punch_id: randomUUID() })), 'forbidden'],
    ['punch update', () => createOp('punches', punchPayload(SEED.ojt4.id), { op_type: 'update' }), 'append_only'],
    ['unknown entity', () => createOp('devices', { id: randomUUID() }), 'unsupported'],
    ['update of a report that does not exist', () => createOp('weekly_reports', { tasks_done: 'x' }, { entity_id: randomUUID(), op_type: 'update', base_version: 1 }), 'not_found'],
    ['missing op_id', () => createOp('punches', punchPayload(SEED.ojt4.id), { op_id: null }), 'invalid_data'],
  ];

  it.each(cases)('TC-CI-SYNC-04: %s gives rejected with a cause code and writes no row', async (_name, make, cause) => {
    const op = make();
    const [result] = await push(ojt4, [op]);
    expect(result).toMatchObject({ result: 'rejected', cause });
    const id = (op['payload'] as { id?: string })['id'];
    if (id) {
      expect(await punchCount(ojt4, id)).toBe(0);
    }
  });

  it('TC-CI-SYNC-04: a rejected operation does not stop the next operations of the batch', async () => {
    const good = createOp('punches', punchPayload(SEED.ojt4.id));
    const results = await push(ojt4, [createOp('punches', punchPayload(SEED.ojt4.id, { type: 'x' })), good]);
    expect(results.map((r) => r.result)).toEqual(['rejected', 'applied']);
  });

  it('TC-CI-SYNC-04: a batch of more than 50 operations is refused', async () => {
    const ops = Array.from({ length: 51 }, () => createOp('punches', punchPayload(SEED.ojt4.id)));
    const { error } = await ojt4.rpc('sync_push', { p_ops: ops, p_device_now: null });
    expect(error).not.toBeNull();
    expect(await punchCount(ojt4, ops[0].entity_id as string)).toBe(0);
  });
});

describe('TC-U-SRV-01 doubtful-time rules', () => {
  const minutes = (n: number) => new Date(Date.now() + n * 60_000);

  it.each([
    ['normal punch', { device_time: minutes(0).toISOString(), clock_offset_s: 0 }, minutes(0), false],
    ['punch more than 2 minutes in the future', { device_time: minutes(10).toISOString(), clock_offset_s: 0 }, minutes(0), true],
    ['punch more than 7 days in the past', { device_time: minutes(-8 * 24 * 60).toISOString(), clock_offset_s: 0 }, minutes(0), true],
    ['offset changed by more than 5 minutes', { device_time: minutes(-120).toISOString(), clock_offset_s: 0 }, minutes(-120), true],
    ['offset changed by less than 5 minutes', { device_time: minutes(-1).toISOString(), clock_offset_s: 0 }, minutes(-1), false],
    ['punch made 3 days ago with a good clock', { device_time: minutes(-3 * 24 * 60).toISOString(), clock_offset_s: 0 }, minutes(0), false],
  ] as const)('TC-U-SRV-01: %s', async (_name, over, deviceNow, doubtful) => {
    const [result] = await push(ojt4, [createOp('punches', punchPayload(SEED.ojt4.id, { ...over }))], deviceNow);
    expect(result.result).toBe('applied');
    expect(result.record?.['doubtful_time']).toBe(doubtful);
  });
});

describe('TC-CI-ACL-01 OJT data scope (sync and Data API)', () => {
  let ojt6PunchId: string;

  beforeAll(async () => {
    const op = createOp('punches', punchPayload(SEED.ojt6.id));
    const [r] = await push(ojt6, [op]);
    expect(r.result).toBe('applied');
    ojt6PunchId = op.entity_id as string;
  });

  it('TC-CI-ACL-01: ojt4 cannot push a punch for ojt6', async () => {
    const op = createOp('punches', punchPayload(SEED.ojt6.id));
    const [result] = await push(ojt4, [op]);
    expect(result).toMatchObject({ result: 'rejected', cause: 'forbidden' });
    expect(await punchCount(ojt6, op.entity_id as string)).toBe(0);
  });

  it('TC-CI-ACL-01: ojt4 cannot take the ID of a punch of ojt6, and sees no data of it', async () => {
    const [result] = await push(ojt4, [createOp('punches', punchPayload(SEED.ojt4.id, { id: ojt6PunchId }))]);
    expect(result).toMatchObject({ result: 'rejected', cause: 'id_conflict' });
    expect(result.record ?? null).toBeNull();
  });

  it('TC-CI-ACL-01: ojt4 reads zero punches of ojt6 through the Data API', async () => {
    const { data, error } = await ojt4.from('punches').select('id').eq('ojt_id', SEED.ojt6.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('TC-CI-ACL-01: ojt4 cannot write punches directly through the Data API', async () => {
    const { error } = await ojt4.from('punches').insert(punchPayload(SEED.ojt4.id));
    expect(error).not.toBeNull();
  });

  it('TC-CI-ACL-01: the admin and anonymous callers cannot use sync_push or sync_pull', async () => {
    const op = createOp('punches', punchPayload(SEED.ojt4.id));
    for (const client of [admin, newClient()]) {
      expect((await client.rpc('sync_push', { p_ops: [op], p_device_now: null })).error).not.toBeNull();
      expect((await client.rpc('sync_pull', { p_cursor: 0, p_epoch: null, p_limit: 1 })).error).not.toBeNull();
    }
  });
});

describe('TC-CI-SYNC-03 pull scope and pages', () => {
  let punchId: string;
  let ojt6PunchId: string;

  beforeAll(async () => {
    const mine = createOp('punches', punchPayload(SEED.ojt4.id));
    const other = createOp('punches', punchPayload(SEED.ojt6.id));
    expect((await push(ojt4, [mine]))[0].result).toBe('applied');
    expect((await push(ojt6, [other]))[0].result).toBe('applied');
    punchId = mine.entity_id as string;
    ojt6PunchId = other.entity_id as string;
    await sleep(PULL_LAG_MS);
  });

  it('TC-CI-SYNC-03: small pages return all records in scope with no gaps and no repeats', async () => {
    const full = await pullAll(ojt4, 0, 500);
    const paged = await pullAll(ojt4, 0, 7);
    const seqs = paged.records.map((r) => r.change_seq);
    expect(new Set(seqs).size).toBe(seqs.length);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
    // Rows can change between the two pulls. Each row of the full pull must be in the paged pull or newer.
    const pagedKeys = new Set(paged.records.map((r) => `${r.entity}:${String(r.data['id'])}`));
    for (const r of full.records) {
      expect(pagedKeys.has(`${r.entity}:${String(r.data['id'])}`)).toBe(true);
    }

    const ids = (entity: string) => paged.records.filter((r) => r.entity === entity).map((r) => r.data['id']);
    expect(ids('punches')).toContain(punchId);
    expect(ids('punches')).not.toContain(ojt6PunchId);
    expect(ids('profiles')).toContain(SEED.ojt4.id);
    expect(ids('profiles')).toContain(SEED.fac1.id);
    expect(ids('profiles')).not.toContain(SEED.ojt6.id);
    expect(ids('companies')).toContain(SEED.companyA);
    expect(ids('batches')).toContain(SEED.batch1);
    expect(paged.records.every((r) => r.entity !== 'punches' || r.data['ojt_id'] === SEED.ojt4.id)).toBe(true);
  });

  it('TC-CI-SYNC-03: the facilitator of ojt4 gets its punch, a different facilitator does not', async () => {
    const f1 = await pullAll(fac1, 0, 500);
    const f2 = await pullAll(fac2, 0, 500);
    const punchIds = (res: { records: PullRecord[] }) => res.records.filter((r) => r.entity === 'punches').map((r) => r.data['id']);
    expect(punchIds(f1)).toContain(punchId);
    expect(punchIds(f2)).not.toContain(punchId);
    expect(punchIds(f2)).toContain(ojt6PunchId);
  });

  it('TC-CI-SYNC-03: a pull from the newest cursor gives only newer changes', async () => {
    const { cursor } = await pullAll(ojt4, 0, 500);
    const op = createOp('punches', punchPayload(SEED.ojt4.id));
    expect((await push(ojt4, [op]))[0].result).toBe('applied');
    await sleep(PULL_LAG_MS);
    const next = await pullAll(ojt4, cursor, 500);
    expect(next.records.map((r) => r.data['id'])).toContain(op.entity_id);
    expect(next.records.every((r) => r.change_seq > cursor)).toBe(true);
  });

  it('TC-CI-SYNC-03: a soft-deleted record comes as a tombstone', async () => {
    const { cursor } = await pullAll(ojt4, 0, 500);
    const { error } = await admin.from('companies').update({ deleted_at: new Date().toISOString() }).eq('id', SEED.companyA);
    expect(error).toBeNull();
    try {
      await sleep(PULL_LAG_MS);
      const next = await pullAll(ojt4, cursor, 500);
      const company = next.records.find((r) => r.entity === 'companies' && r.data['id'] === SEED.companyA);
      expect(company?.data['deleted_at']).toBeTruthy();
    } finally {
      await admin.from('companies').update({ deleted_at: null }).eq('id', SEED.companyA);
    }
  });

  it('TC-CI-SYNC-03: an unknown epoch gives epoch_changed and cursor 0 (section 12)', async () => {
    const res = await pull(ojt4, 12345, randomUUID());
    expect(res).toMatchObject({ epoch_changed: true, cursor: 0, records: [] });
    const { data: epoch } = await ojt4.rpc('server_epoch');
    expect(res.epoch).toBe(epoch);
  });
});
