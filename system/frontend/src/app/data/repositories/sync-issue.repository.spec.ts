import { TestBed } from '@angular/core/testing';
import { PlatformService } from '../../core/platform.service';
import { LocalDb } from '../local-db/local-db';
import { LOCAL_DB_OPENER, LocalDbService } from '../local-db/local-db.service';
import { SqlJsDb } from '../local-db/sqljs.db';
import { enqueue, listOutbox, markOpIssue } from '../sync/outbox';
import { SyncIssueRepository } from './sync-issue.repository';

const OJT = 'ojt-1';

describe('Sync issues (FR-SYNC-06)', () => {
  let db: SqlJsDb;

  beforeEach(async () => {
    db = await SqlJsDb.create();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { platform: 'mobile' } },
        { provide: LOCAL_DB_OPENER, useValue: () => Promise.resolve(db as LocalDb) },
      ],
    });
  });
  afterEach(async () => {
    await db.close();
  });

  /** A punch that the server rejected or that has a conflict, as the sync engine leaves it. */
  async function issue(id: string, cause: string, serverRecord: Record<string, unknown> | null = null): Promise<string> {
    const local = await TestBed.inject(LocalDbService).db();
    await local.run(
      "insert into punches (id, ojt_id, type, device_time, time_zone, device_id, sync_status) values (?, ?, 'in', '2026-10-26T00:00:00Z', 'z', 'd', 'issue')",
      [id, OJT],
    );
    const opId = await enqueue(local, { userId: OJT, entity: 'punches', entityId: id, opType: 'create', payload: { id, type: 'in', device_time: '2026-10-26T00:00:00Z' } });
    await markOpIssue(local, opId, cause, serverRecord);
    return opId;
  }

  const repo = () => TestBed.inject(SyncIssueRepository);
  const rows = async () => (await TestBed.inject(LocalDbService).db()).query('select id, type, sync_status from punches order by id');

  it('TC-ST-OJT-03 (unit part): the list gives the change, the cause, and the server copy', async () => {
    await issue('p1', 'invalid_data');
    await issue('p2', 'version', { id: 'p2', type: 'out', version: 3 });
    const list = await repo().list(OJT);
    expect(list.map((i) => [i.entityId, i.cause, i.serverRecord?.['version'] ?? null])).toEqual([
      ['p1', 'invalid_data', null],
      ['p2', 'version', 3],
    ]);
    expect(list[0].payload['type']).toBe('in');
    expect(await repo().list('other-user')).toEqual([]);
  });

  it('TC-ST-OJT-03 (unit part): "Try again" puts the change back in the queue and the record to pending', async () => {
    await issue('p1', 'invalid_data');
    const [i] = await repo().list(OJT);
    await repo().retry(i);
    const local = await TestBed.inject(LocalDbService).db();
    expect((await listOutbox(local, OJT))[0]).toMatchObject({ status: 'queued', lastError: null });
    expect(await rows()).toEqual([{ id: 'p1', type: 'in', sync_status: 'pending' }]);
    expect(await repo().list(OJT)).toEqual([]);
  });

  it('TC-ST-OJT-03 (unit part): "Discard my change" removes a new record that the server has no copy of', async () => {
    await issue('p1', 'forbidden');
    const [i] = await repo().list(OJT);
    await repo().discard(i);
    expect(await rows()).toEqual([]);
    expect(await listOutbox(await TestBed.inject(LocalDbService).db(), OJT)).toEqual([]);
  });

  it('TC-ST-OJT-03 (unit part): "Discard my change" takes the server copy when the server gave one', async () => {
    await issue('p2', 'version', { id: 'p2', ojt_id: OJT, type: 'out', device_time: '2026-10-26T00:00:00Z', time_zone: 'z', device_id: 'd', version: 3 });
    const [i] = await repo().list(OJT);
    await repo().discard(i);
    expect(await rows()).toEqual([{ id: 'p2', type: 'out', sync_status: 'synced' }]);
  });
});
