import { LocalDb } from '../local-db/local-db';
import { migrate } from '../local-db/migrate';
import { SqlJsDb } from '../local-db/sqljs.db';
import { UnsyncedDataError, clearLocalData, unsyncedCount } from './local-data';
import { countOutbox, enqueue } from './outbox';
import { getState, setState, userKey } from './sync-state';

const A = 'user-a';
const B = 'user-b';

async function punch(db: LocalDb, id: string, owner: string, status: 'pending' | 'synced' | 'issue', withOp: boolean): Promise<void> {
  await db.run(
    "insert into punches (id, ojt_id, type, device_time, time_zone, device_id, sync_status) values (?, ?, 'in', 't', 'z', 'd', ?)",
    [id, owner, status],
  );
  if (withOp) {
    await enqueue(db, { userId: owner, entity: 'punches', entityId: id, opType: 'create', payload: {} });
  }
}

const ids = async (db: LocalDb) => (await db.query<{ id: string }>('select id from punches order by id')).map((r) => r.id);

describe('TC-U-SYNC-06 no delete of unsynced records (QR-SF-03, QR-SF-01)', () => {
  let db: SqlJsDb;

  beforeEach(async () => {
    db = await SqlJsDb.create();
    await migrate(db);
  });
  afterEach(async () => {
    await db.close();
  });

  it('TC-U-SYNC-06: without the confirmation flag, unsynced records stop the clear and nothing is deleted', async () => {
    await punch(db, 'a-pending', A, 'pending', true);
    await punch(db, 'a-synced', A, 'synced', false);
    await expect(clearLocalData(db, A, { discardUnsynced: false })).rejects.toBeInstanceOf(UnsyncedDataError);
    expect(await ids(db)).toEqual(['a-pending', 'a-synced']);
    expect(await countOutbox(db, A)).toBe(1);
  });

  it('TC-U-SYNC-06: the error gives the count of unsynced changes for the CAUTION', async () => {
    await punch(db, 'a1', A, 'pending', true);
    await punch(db, 'a2', A, 'issue', true);
    await punch(db, 'orphan', A, 'pending', false);
    expect(await unsyncedCount(db, A)).toBe(3);
    await expect(clearLocalData(db, A, { discardUnsynced: false })).rejects.toMatchObject({ count: 3 });
  });

  it('TC-U-SYNC-06: with no unsynced records, the clear removes the synced data and the cursors', async () => {
    await punch(db, 'a-synced', A, 'synced', false);
    await setState(db, userKey.cursor(A), '42');
    await setState(db, userKey.cursor(B), '7');
    await clearLocalData(db, A, { discardUnsynced: false });
    expect(await ids(db)).toEqual([]);
    expect(await getState(db, userKey.cursor(A))).toBeNull();
    expect(await getState(db, userKey.cursor(B))).toBeNull();
  });

  it('TC-U-SYNC-06: with the confirmation flag, the unsynced records of the user go, those of a different user stay', async () => {
    await punch(db, 'a-pending', A, 'pending', true);
    await punch(db, 'b-pending', B, 'pending', true);
    await punch(db, 'synced', B, 'synced', false);
    await clearLocalData(db, A, { discardUnsynced: true });
    expect(await ids(db)).toEqual(['b-pending']);
    expect(await countOutbox(db, A)).toBe(0);
    expect(await countOutbox(db, B)).toBe(1);
  });

  it('TC-U-SYNC-06: the unsynced records of a different user do not count for the user', async () => {
    await punch(db, 'b-pending', B, 'pending', true);
    expect(await unsyncedCount(db, A)).toBe(0);
  });
});
