import { LocalDb, Row } from '../local-db/local-db';
import { migrate } from '../local-db/migrate';
import { SqlJsDb } from '../local-db/sqljs.db';
import { FileUploader } from './file-upload';
import { enqueue, listOutbox } from './outbox';
import { SyncEngine } from './sync-engine';
import { clockOffsetS, getState, setState, userKey } from './sync-state';
import { PullResponse, PushOp, PushResponse, PushResult, SyncTransport, TransportError } from './sync-transport';

const OJT = 'ojt-1';
const OTHER = 'ojt-2';
const NOW = new Date('2026-10-26T08:00:00.000Z');
const EPOCH = 'epoch-1';

/** A fake server. `decide` gives the result of each operation. Pull pages come from `pages`. */
class FakeServer implements SyncTransport {
  pushed: PushOp[][] = [];
  pullCalls: { cursor: number; epoch: string | null }[] = [];
  pages: PullResponse[] = [];
  failPush = 0;
  serverTime = NOW.toISOString();
  decide: (op: PushOp) => PushResult['result'] = () => 'applied';
  pullGate: Promise<void> | null = null;

  async push(ops: PushOp[]): Promise<PushResponse> {
    this.pushed.push(ops);
    if (this.failPush > 0) {
      this.failPush--;
      throw new TransportError('unreachable', 'no answer');
    }
    return {
      server_time: this.serverTime,
      results: ops.map((op) => {
        const result = this.decide(op);
        const record = { ...(op.payload as Row), version: 1, server_received_at: this.serverTime, doubtful_time: false, deleted_at: null };
        return result === 'applied' || result === 'duplicate'
          ? { op_id: op.op_id, result, record }
          : { op_id: op.op_id, result, cause: result === 'rejected' ? 'invalid_data' : 'version' };
      }),
    };
  }

  async pull(cursor: number, epoch: string | null): Promise<PullResponse> {
    this.pullCalls.push({ cursor, epoch });
    if (this.pullGate) {
      await this.pullGate;
    }
    return this.pages.shift() ?? { epoch: EPOCH, epoch_changed: false, server_time: this.serverTime, records: [], cursor, has_more: false };
  }
}

function page(records: { entity: string; seq: number; data: Record<string, unknown> }[], hasMore = false): PullResponse {
  return {
    epoch: EPOCH,
    epoch_changed: false,
    server_time: NOW.toISOString(),
    records: records.map((r) => ({ entity: r.entity, change_seq: r.seq, data: r.data })),
    cursor: records.length ? records[records.length - 1].seq : 0,
    has_more: hasMore,
  };
}

function serverPunch(id: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id, ojt_id: OJT, type: 'in', device_time: '2026-10-26T00:00:00.000Z', time_zone: 'Asia/Manila', clock_offset_s: 0,
    server_received_at: '2026-10-26T00:00:05.000Z', lat: null, lng: null, accuracy_m: null, photo_id: null,
    device_id: 'd1', corrects_punch_id: null, doubtful_time: false, approved: false, version: 1,
    created_at: '2026-10-26T00:00:05.000Z', updated_at: '2026-10-26T00:00:05.000Z', deleted_at: null, ...over,
  };
}

/** A local punch with an outbox operation, as the punch repository saves it. */
async function localPunch(db: LocalDb, id: string, userId = OJT, deviceTime = '2026-10-26T00:00:00.000Z'): Promise<void> {
  await db.run(
    `insert into punches (id, ojt_id, type, device_time, time_zone, device_id, sync_status)
     values (?, ?, 'in', ?, 'Asia/Manila', 'd1', 'pending')`,
    [id, userId, deviceTime],
  );
  await enqueue(db, {
    userId, entity: 'punches', entityId: id, opType: 'create',
    payload: { id, ojt_id: userId, type: 'in', device_time: deviceTime, time_zone: 'Asia/Manila', device_id: 'd1' },
  });
}

async function status(db: LocalDb, id: string): Promise<string | undefined> {
  const rows = await db.query<{ sync_status: string }>('select sync_status from punches where id = ?', [id]);
  return rows[0]?.sync_status;
}

describe('sync engine (offline sync design, sections 4, 5, 8, 12)', () => {
  let db: SqlJsDb;
  let server: FakeServer;
  let engine: SyncEngine;
  let user: string | null;

  beforeEach(async () => {
    db = await SqlJsDb.create();
    await migrate(db);
    server = new FakeServer();
    user = OJT;
    engine = new SyncEngine({ db: async () => db, transport: server, userId: () => user, now: () => NOW });
  });
  afterEach(async () => {
    await db.close();
  });

  describe('TC-U-SYNC-02 results of a push', () => {
    it('TC-U-SYNC-02: applied removes the operation and sets the record to synced with the server data', async () => {
      await localPunch(db, 'p1');
      await engine.requestSync();
      expect(await listOutbox(db, OJT)).toEqual([]);
      const rows = await db.query('select sync_status, version, server_received_at from punches where id = ?', ['p1']);
      expect(rows).toEqual([{ sync_status: 'synced', version: 1, server_received_at: NOW.toISOString() }]);
      expect(engine.lastOutcome).toMatchObject({ ok: true, pushed: 1, issues: 0 });
    });

    it('TC-U-SYNC-02: duplicate also removes the operation and sets synced', async () => {
      await localPunch(db, 'p1');
      server.decide = () => 'duplicate';
      await engine.requestSync();
      expect(await listOutbox(db, OJT)).toEqual([]);
      expect(await status(db, 'p1')).toBe('synced');
    });

    it.each(['rejected', 'conflict'] as const)('TC-U-SYNC-02: %s sets issue and keeps the operation', async (result) => {
      await localPunch(db, 'p1');
      server.decide = () => result;
      await engine.requestSync();
      const [op] = await listOutbox(db, OJT);
      expect(op).toMatchObject({ status: 'issue', lastError: result === 'rejected' ? 'invalid_data' : 'version' });
      expect(await status(db, 'p1')).toBe('issue');
      expect(engine.lastOutcome).toMatchObject({ ok: true, issues: 1 });
      // An issue is not sent again by the next sync. The user must act (FR-SYNC-06).
      await engine.requestSync();
      expect(server.pushed).toHaveLength(1);
    });

    it('TC-U-SYNC-02: a failed request puts the operations back in the queue with one more attempt', async () => {
      await localPunch(db, 'p1');
      server.failPush = 1;
      await engine.requestSync();
      const [op] = await listOutbox(db, OJT);
      expect(op).toMatchObject({ status: 'queued', attempts: 1 });
      expect(await status(db, 'p1')).toBe('pending');
      expect(engine.lastOutcome).toMatchObject({ ok: false, error: 'unreachable' });
      expect(server.pullCalls).toHaveLength(0);
    });

    it('TC-U-SYNC-02: more than 50 operations go in batches of 50', async () => {
      for (let i = 0; i < 120; i++) {
        await localPunch(db, `p${i}`);
      }
      await engine.requestSync();
      expect(server.pushed.map((b) => b.length)).toEqual([50, 50, 20]);
      expect(await listOutbox(db, OJT)).toEqual([]);
    });
  });

  describe('TC-U-SYNC-04 one sync at a time', () => {
    it('TC-U-SYNC-04: three triggers during one sync cause one more sync only', async () => {
      let open!: () => void;
      server.pullGate = new Promise<void>((resolve) => (open = resolve));
      const first = engine.requestSync();
      await vi.waitFor(() => expect(server.pullCalls).toHaveLength(1));
      void engine.requestSync();
      void engine.requestSync();
      void engine.requestSync();
      server.pullGate = null;
      open();
      await first;
      expect(server.pullCalls).toHaveLength(2);
    });
  });

  describe('TC-U-SYNC-05 pull merge rules', () => {
    it('TC-U-SYNC-05: a local pending record stays, a synced record changes, a tombstone removes the record', async () => {
      await db.run(
        "insert into punches (id, ojt_id, type, device_time, time_zone, device_id, sync_status, version) values ('kept', ?, 'in', 't', 'z', 'd', 'pending', 0)",
        [OJT],
      );
      await db.run(
        "insert into punches (id, ojt_id, type, device_time, time_zone, device_id, sync_status, version) values ('old', ?, 'in', 't', 'z', 'd', 'synced', 1)",
        [OJT],
      );
      await db.run(
        "insert into punches (id, ojt_id, type, device_time, time_zone, device_id, sync_status, version) values ('gone', ?, 'in', 't', 'z', 'd', 'synced', 1)",
        [OJT],
      );
      server.pages = [
        page([
          { entity: 'punches', seq: 10, data: serverPunch('kept', { type: 'out' }) },
          { entity: 'punches', seq: 11, data: serverPunch('old', { approved: true, version: 2 }) },
          { entity: 'punches', seq: 12, data: serverPunch('gone', { deleted_at: '2026-10-26T01:00:00.000Z' }) },
          { entity: 'punches', seq: 13, data: serverPunch('new') },
        ]),
      ];
      await engine.requestSync();

      const rows = await db.query<{ id: string; type: string; approved: number; sync_status: string }>(
        'select id, type, approved, sync_status from punches order by id',
      );
      expect(rows).toEqual([
        { id: 'kept', type: 'in', approved: 0, sync_status: 'pending' },
        { id: 'new', type: 'in', approved: 0, sync_status: 'synced' },
        { id: 'old', type: 'in', approved: 1, sync_status: 'synced' },
      ]);
    });

    it('TC-U-SYNC-05: the cursor and the epoch are stored, and all pages are read', async () => {
      server.pages = [
        page([{ entity: 'punches', seq: 5, data: serverPunch('a') }], true),
        page([{ entity: 'profiles', seq: 9, data: { id: OJT, role: 'ojt', full_name: 'OJT One', status: 'active', version: 1 } }]),
      ];
      await engine.requestSync();
      expect(server.pullCalls).toEqual([{ cursor: 0, epoch: null }, { cursor: 5, epoch: EPOCH }]);
      expect(await getState(db, userKey.cursor(OJT))).toBe('9');
      expect(await getState(db, userKey.epoch(OJT))).toBe(EPOCH);
      expect(await db.query('select id, full_name from profiles')).toEqual([{ id: OJT, full_name: 'OJT One' }]);
    });

    it('TC-U-SYNC-05: records of entities that the app does not store are ignored', async () => {
      server.pages = [page([{ entity: 'audit_logs', seq: 3, data: { id: 'x' } }])];
      await engine.requestSync();
      expect(engine.lastOutcome).toMatchObject({ ok: true, pulled: 1 });
    });
  });

  describe('TC-U-SYNC-07 clock offset', () => {
    it('TC-U-SYNC-07: after a sync, the app stores server time minus device time', async () => {
      await localPunch(db, 'p1');
      server.serverTime = new Date(NOW.getTime() + 120_000).toISOString();
      await engine.requestSync();
      expect(await clockOffsetS(db)).toBe(120);
    });

    it('TC-U-SYNC-07: a sync with nothing to push also stores the offset (from the pull)', async () => {
      server.pages = [{ ...page([]), server_time: new Date(NOW.getTime() - 30_000).toISOString() }];
      await engine.requestSync();
      expect(await clockOffsetS(db)).toBe(-30);
    });
  });

  describe('server epoch change (section 12, TC-SI-SYNC-07 unit part)', () => {
    it('TC-SI-SYNC-07 (unit part): resets the cursor and sends the own records of the last 30 days again', async () => {
      await setState(db, userKey.cursor(OJT), '500');
      await setState(db, userKey.epoch(OJT), 'old-epoch');
      const recent = serverPunch('recent', { device_time: '2026-10-20T00:00:00.000Z' });
      const old = serverPunch('old', { device_time: '2026-09-01T00:00:00.000Z' });
      const others = serverPunch('others', { ojt_id: OTHER, device_time: '2026-10-20T00:00:00.000Z' });
      server.pages = [page([1, 2, 3].map((seq, i) => ({ entity: 'punches', seq, data: [recent, old, others][i] })))];
      await engine.requestSync();
      expect(await db.query("select id from punches where sync_status = 'synced' order by id")).toHaveLength(3);

      server.pages = [{ ...page([]), epoch: 'new-epoch', epoch_changed: true, cursor: 0, has_more: true }];
      server.pushed = [];
      await engine.requestSync();

      // A full pull from cursor 0 followed. Then a second sync of the same request sent the record again.
      expect(server.pullCalls).toContainEqual({ cursor: 0, epoch: 'new-epoch' });
      expect(server.pushed.flat().map((op) => op.entity_id)).toEqual(['recent']);
      expect(await listOutbox(db, OJT)).toEqual([]);
    });
  });

  describe('app stop and other users (TC-SI-SYNC-03, TC-SI-SYNC-04 unit parts)', () => {
    it('TC-SI-SYNC-03 (unit part): operations left in sending by an app stop are sent at the next sync', async () => {
      await localPunch(db, 'p1');
      await db.run("update outbox set status = 'sending'");
      await engine.requestSync();
      expect(server.pushed.flat().map((op) => op.entity_id)).toEqual(['p1']);
      expect(await listOutbox(db, OJT)).toEqual([]);
    });

    it('TC-SI-SYNC-04 (unit part): the outbox of a different user is not sent', async () => {
      await localPunch(db, 'mine', OJT);
      await localPunch(db, 'theirs', OTHER);
      await engine.requestSync();
      expect(server.pushed.flat().map((op) => op.entity_id)).toEqual(['mine']);
      expect(await listOutbox(db, OTHER)).toHaveLength(1);
      expect(await status(db, 'theirs')).toBe('pending');
    });

    it('TC-SI-SYNC-04 (unit part): with no logged-in user, nothing is sent', async () => {
      user = null;
      await localPunch(db, 'p1');
      await engine.requestSync();
      expect(server.pushed).toHaveLength(0);
      expect(engine.lastOutcome).toMatchObject({ ok: false, error: 'no-user' });
    });
  });

  describe('photo files (section 10, TC-SI-FILE-01 unit part)', () => {
    /** A fake Storage. It records each call, and the order of the uploads and the pushes. */
    let events: string[];
    let uploadFailure: TransportError | null;
    const uploader: FileUploader = {
      upload: async (localPath, storageKey) => {
        events.push(`upload ${storageKey}`);
        if (uploadFailure) {
          throw uploadFailure;
        }
      },
    };

    /** A photo and its punch, as the punch repository saves them in one transaction. */
    async function localPhotoPunch(photoId: string, punchId: string, userId = OJT): Promise<void> {
      await db.run(
        `insert into attachments (id, owner_id, storage_key, local_path, upload_status, sync_status)
         values (?, ?, ?, ?, 'local', 'pending')`,
        [photoId, userId, `${userId}/${photoId}.jpg`, `photos/${userId}/${photoId}.jpg`],
      );
      await enqueue(db, {
        userId, entity: 'attachments', entityId: photoId, opType: 'create',
        payload: { id: photoId, owner_id: userId, report_id: null, storage_key: `${userId}/${photoId}.jpg` },
      });
      await localPunch(db, punchId, userId);
    }

    const uploadStatus = async (id: string) =>
      (await db.query<{ upload_status: string }>('select upload_status from attachments where id = ?', [id]))[0]?.upload_status;

    beforeEach(() => {
      events = [];
      uploadFailure = null;
      const push = server.push.bind(server);
      server.push = async (ops) => {
        events.push(`push ${ops.map((o) => o.entity_id).join(',')}`);
        return push(ops);
      };
      engine = new SyncEngine({ db: async () => db, transport: server, files: uploader, userId: () => user, now: () => NOW });
    });

    it('TC-SI-FILE-01 (unit part): the file uploads before the push, and the photo operation goes before the punch', async () => {
      await localPhotoPunch('f1', 'p1');
      await engine.requestSync();
      expect(events).toEqual([`upload ${OJT}/f1.jpg`, 'push f1,p1']);
      expect(await uploadStatus('f1')).toBe('uploaded');
      expect(await listOutbox(db, OJT)).toEqual([]);
    });

    it('TC-SI-FILE-01 (unit part): an uploaded file is not uploaded again', async () => {
      await localPhotoPunch('f1', 'p1');
      server.decide = (op) => (op.entity === 'punches' ? 'rejected' : 'applied');
      await engine.requestSync();
      events = [];
      await engine.requestSync();
      expect(events.filter((e) => e.startsWith('upload'))).toEqual([]);
    });

    it('TC-SI-FILE-01 (unit part): with no server, nothing is pushed, and the next sync uploads the file', async () => {
      await localPhotoPunch('f1', 'p1');
      uploadFailure = new TransportError('unreachable', 'no answer');
      await engine.requestSync();
      expect(engine.lastOutcome).toMatchObject({ ok: false, error: 'unreachable' });
      expect(events).toEqual([`upload ${OJT}/f1.jpg`]);
      expect(await uploadStatus('f1')).toBe('local');
      expect(await listOutbox(db, OJT)).toHaveLength(2);

      uploadFailure = null;
      await engine.requestSync();
      expect(events.slice(1)).toEqual([`upload ${OJT}/f1.jpg`, 'push f1,p1']);
      expect(await listOutbox(db, OJT)).toEqual([]);
    });

    it('TC-SI-FILE-01 (unit part): a refused file does not stop the other changes', async () => {
      await localPhotoPunch('f1', 'p1');
      uploadFailure = new TransportError('refused', 'too large');
      await engine.requestSync();
      expect(events).toEqual([`upload ${OJT}/f1.jpg`, 'push f1,p1']);
      expect(engine.lastOutcome).toMatchObject({ ok: true });
      expect(await uploadStatus('f1')).toBe('local');
    });

    it('TC-SI-FILE-01 (unit part): the files of a different user are not uploaded', async () => {
      await localPhotoPunch('f2', 'p2', OTHER);
      await engine.requestSync();
      expect(events).toEqual([]);
    });

    it('TC-SI-SYNC-07 (unit part): after an epoch change, the photo is uploaded and sent again before its punch', async () => {
      await localPhotoPunch('f1', 'p1');
      await engine.requestSync();
      await db.run("update attachments set updated_at = '2026-10-26T00:00:05.000Z'");
      server.pages = [{ ...page([]), epoch: 'new-epoch', epoch_changed: true, cursor: 0, has_more: true }];
      events = [];
      await engine.requestSync();
      expect(events).toEqual([`upload ${OJT}/f1.jpg`, 'push f1,p1']);
    });
  });
});
