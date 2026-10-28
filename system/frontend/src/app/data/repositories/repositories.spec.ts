import { TestBed } from '@angular/core/testing';
import { PlatformService } from '../../core/platform.service';
import { SUPABASE } from '../../core/supabase.client';
import { LocalDb } from '../local-db/local-db';
import { LOCAL_DB_OPENER, LocalDbService } from '../local-db/local-db.service';
import { SqlJsDb } from '../local-db/sqljs.db';
import { countOutbox, listOutbox } from '../sync/outbox';
import { ProfileRepository } from './profile.repository';
import { NewPunch, PunchRepository } from './punch.repository';

const OJT = '00000000-0000-4000-a000-000000000021';

const punch = (id: string, overrides: Partial<NewPunch> = {}): NewPunch => ({
  id,
  ojtId: OJT,
  type: 'in',
  deviceTime: '2026-10-26T00:00:00.000Z',
  timeZone: 'Asia/Manila',
  clockOffsetS: -2,
  lat: 14.7,
  lng: 120.98,
  accuracyM: 12.5,
  photoId: null,
  deviceId: 'device-1',
  correctsPunchId: null,
  ...overrides,
});

describe('TC-CI-DB-02 repositories with the SQLite adapter (FR-SYNC-01, FR-AUTH-04)', () => {
  let db: SqlJsDb;

  beforeEach(async () => {
    db = await SqlJsDb.create();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { platform: 'mobile' } },
        { provide: LOCAL_DB_OPENER, useValue: () => Promise.resolve(db as LocalDb) },
        { provide: SUPABASE, useValue: {} },
      ],
    });
  });
  afterEach(async () => {
    await db.close();
  });

  it('TC-CI-DB-02 a saved punch reads back with the same data and status pending', async () => {
    const repo = TestBed.inject(PunchRepository);
    const input = punch('p-1');
    const saved = await repo.saveNew(input, OJT);
    expect(saved).toEqual({
      ...input,
      serverReceivedAt: null,
      doubtfulTime: false,
      approved: false,
      version: 0,
      syncStatus: 'pending',
    });
    expect(await repo.getById('p-1')).toEqual(saved);
  });

  it('TC-CI-DB-02 the save makes one outbox operation with the punch data', async () => {
    const repo = TestBed.inject(PunchRepository);
    await repo.saveNew(punch('p-1'), OJT);
    const local = await TestBed.inject(LocalDbService).db();
    const ops = await listOutbox(local, OJT);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      userId: OJT,
      entity: 'punches',
      entityId: 'p-1',
      opType: 'create',
      status: 'queued',
      attempts: 0,
      baseVersion: null,
    });
    expect(ops[0].opId).toMatch(/^[0-9a-f-]{36}$/);
    expect(ops[0].payload).toMatchObject({ id: 'p-1', ojt_id: OJT, type: 'in', device_id: 'device-1', lat: 14.7 });
  });

  it('TC-U-SYNC-01: a local save makes status pending and one outbox operation with a unique op_id', async () => {
    const repo = TestBed.inject(PunchRepository);
    await repo.saveNew(punch('p-1'), OJT);
    await repo.saveNew(punch('p-2', { type: 'out' }), OJT);
    const local = await TestBed.inject(LocalDbService).db();
    const ops = await listOutbox(local, OJT);
    expect(ops.map((o) => o.entityId)).toEqual(['p-1', 'p-2']);
    expect(new Set(ops.map((o) => o.opId)).size).toBe(2);
    expect((await repo.listByOjt(OJT)).map((p) => p.syncStatus)).toEqual(['pending', 'pending']);
  });

  it('TC-CI-DB-02 a failed save leaves no punch and no outbox operation', async () => {
    const repo = TestBed.inject(PunchRepository);
    await repo.saveNew(punch('p-1'), OJT);
    // The same ID again violates the primary key. The transaction must roll back both inserts.
    await expect(repo.saveNew(punch('p-1', { type: 'out' }), OJT)).rejects.toThrow();
    const local = await TestBed.inject(LocalDbService).db();
    expect(await countOutbox(local, OJT)).toBe(1);
    expect((await repo.listByOjt(OJT)).map((p) => p.type)).toEqual(['in']);
  });

  it('TC-CI-DB-02 punches list in time order', async () => {
    const repo = TestBed.inject(PunchRepository);
    await repo.saveNew(punch('p-2', { type: 'out', deviceTime: '2026-10-26T09:00:00.000Z' }), OJT);
    await repo.saveNew(punch('p-1', { deviceTime: '2026-10-26T00:00:00.000Z' }), OJT);
    expect((await repo.listByOjt(OJT)).map((p) => p.id)).toEqual(['p-1', 'p-2']);
  });

  it('TC-CI-DB-02 the outbox of a different user is not given (offline sync design 9.5)', async () => {
    const repo = TestBed.inject(PunchRepository);
    await repo.saveNew(punch('p-1'), OJT);
    const local = await TestBed.inject(LocalDbService).db();
    expect(await listOutbox(local, 'another-user')).toEqual([]);
  });

  it('TC-CI-DB-02 the stored profile reads back', async () => {
    const repo = TestBed.inject(ProfileRepository);
    const profile = { id: OJT, role: 'ojt' as const, fullName: 'OJT One', status: 'active' as const };
    await repo.cacheLocal(profile);
    expect(await repo.getLocal(OJT)).toEqual(profile);
    // A second save changes the row, it does not add a row.
    await repo.cacheLocal({ ...profile, fullName: 'OJT One A' });
    expect((await repo.getLocal(OJT))?.fullName).toBe('OJT One A');
    expect(await repo.getLocal('missing')).toBeNull();
  });

  it('TC-CI-DB-02 the web app has no local database (D-13)', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { platform: 'web' } },
        { provide: SUPABASE, useValue: {} },
      ],
    });
    const repo = TestBed.inject(ProfileRepository);
    await repo.cacheLocal({ id: 'a', role: 'admin', fullName: 'A', status: 'active' });
    expect(await repo.getLocal('a')).toBeNull();
    await expect(TestBed.inject(LocalDbService).db()).rejects.toThrow();
  });
});
