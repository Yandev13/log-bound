import { TestBed } from '@angular/core/testing';
import { LocalDb } from '../../data/local-db/local-db';
import { LOCAL_DB_OPENER, LocalDbService } from '../../data/local-db/local-db.service';
import { SqlJsDb } from '../../data/local-db/sqljs.db';
import { countOutbox, enqueue } from '../../data/sync/outbox';
import { SyncService } from '../../data/sync/sync.service';
import { FILES } from '../../plugins/files.plugin';
import { PlatformService } from '../platform.service';
import { AuthService } from './auth.service';
import { LogoutService } from './logout.service';

const OJT = 'ojt-1';

describe('Logout with unsynced changes (FR-AUTH-05, QR-SF-01)', () => {
  let db: SqlJsDb;
  const signOut = vi.fn(async () => undefined);
  const trigger = vi.fn(async () => undefined);
  const stop = vi.fn();
  const removeFolder = vi.fn(async () => undefined);

  function setup(platform: 'mobile' | 'web' = 'mobile') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { platform } },
        { provide: LOCAL_DB_OPENER, useValue: () => Promise.resolve(db as LocalDb) },
        { provide: AuthService, useValue: { profile: () => ({ id: OJT, role: 'ojt' }), signOut } },
        { provide: SyncService, useValue: { trigger, stop } },
        { provide: FILES, useValue: { removeFolder } },
      ],
    });
    return TestBed.inject(LogoutService);
  }

  beforeEach(async () => {
    db = await SqlJsDb.create();
    [signOut, trigger, stop, removeFolder].forEach((f) => f.mockClear());
  });
  afterEach(async () => {
    await db.close();
  });

  async function pendingPunch(): Promise<void> {
    const local = await TestBed.inject(LocalDbService).db();
    await local.run("insert into punches (id, ojt_id, type, device_time, time_zone, device_id, sync_status) values ('p1', ?, 'in', 't', 'z', 'd', 'pending')", [OJT]);
    await enqueue(local, { userId: OJT, entity: 'punches', entityId: 'p1', opType: 'create', payload: {} });
  }

  it('TC-ST-OJT-04 (unit part): before the CAUTION, the app tries a sync and gives the count', async () => {
    const service = setup();
    await pendingPunch();
    expect(await service.unsyncedBeforeLogout()).toBe(1);
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('TC-ST-OJT-04 (unit part): "Cancel" keeps the session: a logout without the confirmation changes nothing', async () => {
    const service = setup();
    await pendingPunch();
    expect(await service.logout(false)).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
    expect(removeFolder).not.toHaveBeenCalled();
    expect(await countOutbox(await TestBed.inject(LocalDbService).db(), OJT)).toBe(1);
  });

  it('TC-ST-OJT-04 (unit part): "Confirm" logs out and removes the unsynced changes', async () => {
    const service = setup();
    await pendingPunch();
    expect(await service.logout(true)).toBe(true);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(await countOutbox(await TestBed.inject(LocalDbService).db(), OJT)).toBe(0);
    // The photo files of the user go with the records.
    expect(removeFolder).toHaveBeenCalledWith('photos/ojt-1');
  });

  it('TC-ST-OJT-04 (unit part): with no unsynced changes, the logout needs no confirmation', async () => {
    const service = setup();
    expect(await service.unsyncedBeforeLogout()).toBe(0);
    expect(await service.logout(false)).toBe(true);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('TC-ST-OJT-04 (unit part): the admin web app has no local data and logs out at once', async () => {
    const service = setup('web');
    expect(await service.unsyncedBeforeLogout()).toBe(0);
    expect(await service.logout(false)).toBe(true);
    expect(trigger).not.toHaveBeenCalled();
  });
});
