// L2 tests of the photo files (offline sync design, section 10; QR-PE-05; API contract 5.1 and 7).
// ojt4 (facilitator fac1) owns the files. ojt6 (facilitator fac2) is the other OJT.
// NOTE: Files cannot be deleted through the API. Each run leaves about 540 KB in the `dev` bucket
// (1 GB on the Free plan, so about 1,800 runs).
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SEED, signedIn } from './helpers';

const BUCKET = 'attachments';

/** A JPEG-like body of `size` bytes. The bucket checks the content type and the size, not the image data. */
function jpeg(size: number): Uint8Array {
  const body = new Uint8Array(size);
  body.set([0xff, 0xd8, 0xff, 0xe0]);
  return body;
}

const keyOf = (owner: string, id: string) => `${owner}/${id}.jpg`;

async function upload(client: SupabaseClient, key: string, size: number, contentType = 'image/jpeg') {
  return client.storage.from(BUCKET).upload(key, jpeg(size), { contentType, upsert: false });
}

async function push(client: SupabaseClient, ops: unknown[]) {
  const { data, error } = await client.rpc('sync_push', { p_ops: ops, p_device_now: new Date().toISOString() });
  if (error) {
    throw new Error(error.message);
  }
  return (data as { results: { result: string; cause?: string; record?: Record<string, unknown> }[] }).results;
}

const attachmentOp = (owner: string, id: string, over: Record<string, unknown> = {}) => ({
  op_id: randomUUID(),
  entity: 'attachments',
  entity_id: id,
  op_type: 'create',
  base_version: null,
  payload: { id, owner_id: owner, report_id: null, storage_key: keyOf(owner, id), ...over },
});

let ojt4: SupabaseClient;
let ojt6: SupabaseClient;
let fac1: SupabaseClient;
let fac2: SupabaseClient;
/** One photo of ojt4, uploaded in beforeAll. */
const photoId = randomUUID();
const photoKey = keyOf(SEED.ojt4.id, photoId);

beforeAll(async () => {
  [ojt4, ojt6, fac1, fac2] = await Promise.all(
    [SEED.ojt4.email, SEED.ojt6.email, SEED.fac1.email, SEED.fac2.email].map((e) => signedIn(e)),
  );
  const { error } = await upload(ojt4, photoKey, 20_000);
  expect(error).toBeNull();
});

afterAll(async () => {
  await Promise.all([ojt4, ojt6, fac1, fac2].map((c) => c?.auth.signOut({ scope: 'local' })));
});

describe('TC-CI-FILE-01 photo upload (QR-PE-05)', () => {
  it('TC-CI-FILE-01: a photo of 500 KB or less is accepted', async () => {
    const { error } = await upload(ojt4, keyOf(SEED.ojt4.id, randomUUID()), 512_000);
    expect(error).toBeNull();
  });

  it('TC-CI-FILE-01: a larger file is rejected', async () => {
    const { error } = await upload(ojt4, keyOf(SEED.ojt4.id, randomUUID()), 512_001);
    expect(error).not.toBeNull();
  });

  it('TC-CI-FILE-01: a file that is not JPEG is rejected', async () => {
    const { error } = await upload(ojt4, keyOf(SEED.ojt4.id, randomUUID()), 1_000, 'image/png');
    expect(error).not.toBeNull();
  });

  it('TC-CI-FILE-01: a file cannot be replaced (no update, D-05)', async () => {
    const { error } = await upload(ojt4, photoKey, 1_000);
    expect(error).not.toBeNull();
    const { data } = await ojt4.storage.from(BUCKET).download(photoKey);
    expect(data?.size).toBe(20_000);
  });

  it('TC-CI-FILE-01: a file name that is not <owner>/<id>.jpg is rejected', async () => {
    expect((await upload(ojt4, `${SEED.ojt4.id}/photo.jpg`, 1_000)).error).not.toBeNull();
    expect((await upload(ojt4, `${randomUUID()}.jpg`, 1_000)).error).not.toBeNull();
  });

  it('TC-CI-FILE-01: the attachment record is applied after the upload, with the size from Storage', async () => {
    const [result] = await push(ojt4, [attachmentOp(SEED.ojt4.id, photoId, { size_bytes: 1 })]);
    expect(result.result).toBe('applied');
    expect(result.record).toMatchObject({ id: photoId, owner_id: SEED.ojt4.id, storage_key: photoKey, size_bytes: 20_000 });
  });

  it('TC-CI-FILE-01: an attachment record without its file is rejected (file_missing)', async () => {
    const [result] = await push(ojt4, [attachmentOp(SEED.ojt4.id, randomUUID())]);
    expect(result).toMatchObject({ result: 'rejected', cause: 'file_missing' });
  });

  it('TC-CI-FILE-01: the attachment and its punch in one batch are both applied (file first, section 10)', async () => {
    const id = randomUUID();
    expect((await upload(ojt4, keyOf(SEED.ojt4.id, id), 5_000)).error).toBeNull();
    const punchId = randomUUID();
    const results = await push(ojt4, [
      attachmentOp(SEED.ojt4.id, id),
      {
        op_id: randomUUID(), entity: 'punches', entity_id: punchId, op_type: 'create', base_version: null,
        payload: {
          id: punchId, ojt_id: SEED.ojt4.id, type: 'in', device_time: new Date().toISOString(), time_zone: 'Asia/Manila',
          clock_offset_s: 0, lat: null, lng: null, accuracy_m: null, photo_id: id, device_id: 'l2-test-device', corrects_punch_id: null,
        },
      },
    ]);
    expect(results.map((r) => r.result)).toEqual(['applied', 'applied']);
    expect(results[1].record?.['photo_id']).toBe(id);
  });
});

describe('TC-CI-ACL-01 OJT data scope (Storage part)', () => {
  it('TC-CI-ACL-01: ojt4 cannot upload into the folder of ojt6', async () => {
    const { error } = await upload(ojt4, keyOf(SEED.ojt6.id, randomUUID()), 1_000);
    expect(error).not.toBeNull();
  });

  it('TC-CI-ACL-01: ojt6 and a different facilitator cannot read the photo of ojt4', async () => {
    for (const client of [ojt6, fac2]) {
      const { data, error } = await client.storage.from(BUCKET).download(photoKey);
      expect(data).toBeNull();
      expect(error).not.toBeNull();
    }
  });

  it('TC-CI-ACL-01: the facilitator of ojt4 can read the photo', async () => {
    const { data, error } = await fac1.storage.from(BUCKET).download(photoKey);
    expect(error).toBeNull();
    expect(data?.size).toBe(20_000);
  });

  it('TC-CI-ACL-01: only the owner and its facilitator read the attachment record', async () => {
    for (const [client, rows] of [[ojt4, 1], [fac1, 1], [ojt6, 0], [fac2, 0]] as const) {
      const { data, error } = await client.from('attachments').select('id').eq('id', photoId);
      expect(error).toBeNull();
      expect(data).toHaveLength(rows);
    }
  });

  it('TC-CI-ACL-01: a facilitator cannot upload a photo', async () => {
    const { error } = await upload(fac1, keyOf(SEED.fac1.id, randomUUID()), 1_000);
    expect(error).not.toBeNull();
  });

  it('TC-CI-ACL-01: ojt6 cannot make an attachment record for the file of ojt4', async () => {
    const [result] = await push(ojt6, [attachmentOp(SEED.ojt4.id, randomUUID())]);
    expect(result).toMatchObject({ result: 'rejected', cause: 'forbidden' });
  });

  it('TC-CI-ACL-01: the owner cannot delete a photo', async () => {
    await ojt4.storage.from(BUCKET).remove([photoKey]);
    const { data } = await ojt4.storage.from(BUCKET).download(photoKey);
    expect(data?.size).toBe(20_000);
  });
});
