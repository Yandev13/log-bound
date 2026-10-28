import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { PlatformService } from '../../core/platform.service';
import { SUPABASE } from '../../core/supabase.client';
import { LocalDb } from '../../data/local-db/local-db';
import { LOCAL_DB_OPENER, LocalDbService } from '../../data/local-db/local-db.service';
import { SqlJsDb } from '../../data/local-db/sqljs.db';
import { PunchRepository } from '../../data/repositories/punch.repository';
import { listOutbox } from '../../data/sync/outbox';
import { setClockOffsetS } from '../../data/sync/sync-state';
import { SyncService } from '../../data/sync/sync.service';
import { mergePulled } from '../../data/sync/local-merge';
import { CAMERA, SelfieResult } from '../../plugins/camera.plugin';
import { FILES } from '../../plugins/files.plugin';
import { GEOLOCATION, Location } from '../../plugins/geolocation.plugin';
import { DTR_SETTINGS } from '../../shared/config/dtr-settings';
import { DtrService } from './dtr.service';

const OJT = '00000000-0000-4000-a000-000000000021';
const at = (iso: string) => new Date(iso);

describe('DTR service (FR-DTR-01 to FR-DTR-04, FR-DTR-08, FR-DTR-09)', () => {
  let db: SqlJsDb;
  let location: Location | null;
  let role: 'ojt' | 'facilitator';
  const changed = vi.fn();
  const currentLocation = vi.fn(async () => location);
  let selfie: SelfieResult;
  const takeSelfie = vi.fn(async () => selfie);
  const written = new Map<string, string>();

  beforeEach(async () => {
    db = await SqlJsDb.create();
    location = { lat: 14.6996, lng: 120.9842, accuracyM: 5 };
    role = 'ojt';
    changed.mockClear();
    currentLocation.mockClear();
    takeSelfie.mockClear();
    written.clear();
    selfie = { ok: true, jpeg: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' }) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { platform: 'mobile' } },
        { provide: LOCAL_DB_OPENER, useValue: () => Promise.resolve(db as LocalDb) },
        { provide: SUPABASE, useValue: {} },
        { provide: AuthService, useValue: { profile: () => ({ id: OJT, role, fullName: 'OJT One', status: 'active' }) } },
        { provide: SyncService, useValue: { changed } },
        { provide: GEOLOCATION, useValue: { prepare: async () => undefined, currentLocation } },
        { provide: CAMERA, useValue: { takeSelfie } },
        { provide: FILES, useValue: { write: async (path: string, data: string) => void written.set(path, data) } },
      ],
    });
  });
  afterEach(async () => {
    await db.close();
  });

  const service = () => TestBed.inject(DtrService);

  it('TC-U-DTR-01: a second time-in while a session is open is rejected with the cause', async () => {
    expect((await service().timeIn(at('2026-10-26T00:00:00Z'))).ok).toBe(true);
    const second = await service().timeIn(at('2026-10-26T01:00:00Z'));
    expect(second).toEqual({ ok: false, reason: 'session-open' });
    expect(await TestBed.inject(PunchRepository).listByOjt(OJT)).toHaveLength(1);
  });

  it('TC-U-DTR-01: after a time-out, a new time-in is accepted', async () => {
    await service().timeIn(at('2026-10-26T00:00:00Z'));
    await service().timeOut(at('2026-10-26T08:00:00Z'));
    expect((await service().timeIn(at('2026-10-27T00:00:00Z'))).ok).toBe(true);
  });

  it('TC-U-DTR-02: a time-out with no open session is rejected with the cause', async () => {
    expect(await service().timeOut(at('2026-10-26T08:00:00Z'))).toEqual({ ok: false, reason: 'no-open-session' });
    await service().timeIn(at('2026-10-26T00:00:00Z'));
    await service().timeOut(at('2026-10-26T08:00:00Z'));
    expect(await service().timeOut(at('2026-10-26T09:00:00Z'))).toEqual({ ok: false, reason: 'no-open-session' });
  });

  it('TC-U-DTR-03: a session open 16 hours after its time-in gets the "Missing time-out" mark', async () => {
    await service().timeIn(at('2026-10-26T00:00:00Z'));
    const before = await service().sessions(OJT, at('2026-10-26T15:59:00Z'));
    const after = await service().sessions(OJT, at('2026-10-26T16:00:00Z'));
    expect(before[0].missingTimeOut).toBe(false);
    expect(after[0].missingTimeOut).toBe(true);
    expect(DTR_SETTINGS.missingTimeOutHours).toBe(16);
  });

  it('TC-U-DTR-03: a session from 22:00 to 02:00 does not get the mark (D-37)', async () => {
    // 22:00 and 02:00 Asia/Manila are 14:00 and 18:00 UTC.
    await service().timeIn(at('2026-10-26T14:00:00Z'));
    await service().timeOut(at('2026-10-26T18:00:00Z'));
    const [s] = await service().sessions(OJT, at('2026-10-28T00:00:00Z'));
    expect(s.missingTimeOut).toBe(false);
    expect(s.minutes).toBe(240);
  });

  it('TC-U-DTR-03: a session with the mark does not stop the next time-in, and a time-out does not close it (D-47)', async () => {
    await service().timeIn(at('2026-10-26T00:00:00Z'));
    expect(await service().timeOut(at('2026-10-26T17:00:00Z'))).toEqual({ ok: false, reason: 'no-open-session' });
    expect((await service().timeIn(at('2026-10-27T00:00:00Z'))).ok).toBe(true);
  });

  it('TC-U-DTR-04: with permission, the punch has the device time, time zone, device ID, location, and accuracy', async () => {
    const result = await service().timeIn(at('2026-10-26T00:00:00Z'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.noLocation).toBe(false);
    expect(result.punch).toMatchObject({
      ojtId: OJT,
      type: 'in',
      deviceTime: '2026-10-26T00:00:00.000Z',
      lat: 14.6996,
      lng: 120.9842,
      accuracyM: 5,
      syncStatus: 'pending',
    });
    expect(result.punch.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(result.punch.deviceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(currentLocation).toHaveBeenCalledWith(DTR_SETTINGS.locationWaitMs, DTR_SETTINGS.locationMaxAgeMs);
  });

  it('TC-U-DTR-04: without permission, the punch is saved with the "no location" flag (QR-SF-05)', async () => {
    location = null;
    const result = await service().timeIn(at('2026-10-26T00:00:00Z'));
    expect(result).toMatchObject({ ok: true, noLocation: true, punch: { lat: null, lng: null, accuracyM: null } });
    const local = await TestBed.inject(LocalDbService).db();
    expect(await listOutbox(local, OJT)).toHaveLength(1);
  });

  it('TC-U-DTR-04: the device ID is the same for each punch', async () => {
    const a = await service().timeIn(at('2026-10-26T00:00:00Z'));
    const b = await service().timeOut(at('2026-10-26T08:00:00Z'));
    expect(a.ok && b.ok && a.punch.deviceId === b.punch.deviceId).toBe(true);
  });

  it('TC-U-SYNC-07: the next punch has the clock offset of the last sync', async () => {
    const local = await TestBed.inject(LocalDbService).db();
    await setClockOffsetS(local, 120);
    const result = await service().timeIn(at('2026-10-26T00:00:00Z'));
    expect(result.ok && result.punch.clockOffsetS).toBe(120);
  });

  it('TC-U-SYNC-01: a punch starts a sync request and needs no network', async () => {
    await service().timeIn(at('2026-10-26T00:00:00Z'));
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('TC-U-DTR-01: a facilitator cannot record punches', async () => {
    role = 'facilitator';
    expect(await service().timeIn(at('2026-10-26T00:00:00Z'))).toEqual({ ok: false, reason: 'not-ojt' });
  });
  it('TC-SI-SYNC-05 (unit part): punches made with a clock 2 hours ahead do not block the next time-out (D-51, DEF-013)', async () => {
    // Real time 09:00 UTC. The device clock shows 11:00, then the user corrects it.
    await service().timeIn(at('2026-10-26T11:00:00Z'));
    await service().timeOut(at('2026-10-26T11:04:00Z'));
    const now = at('2026-10-26T09:20:00Z');
    expect(await service().currentOpenSession(OJT, now)).toBeNull();
    expect((await service().timeIn(now)).ok).toBe(true);
    expect(await service().currentOpenSession(OJT, at('2026-10-26T09:21:00Z'))).toMatchObject({ timeIn: { time: now.toISOString() } });
    expect(await service().timeIn(at('2026-10-26T09:21:00Z'))).toEqual({ ok: false, reason: 'session-open' });
    expect((await service().timeOut(at('2026-10-26T09:25:00Z'))).ok).toBe(true);
  });

  describe('FR-DTR-05 selfie when the company requires a photo (TC-SI-FILE-01 unit part)', () => {
    async function company(photoRequired: boolean): Promise<void> {
      const local = await TestBed.inject(LocalDbService).db();
      await mergePulled(local, 'companies', { id: 'c1', name: 'Company B', address: '', photo_required: photoRequired, location_required: false, version: 1 });
      await mergePulled(local, 'ojt_assignments', { id: 'a1', ojt_id: OJT, facilitator_id: 'f1', company_id: 'c1', batch_id: 'b1', active: true, version: 1 });
    }

    it('TC-SI-FILE-01 (unit part): the photo is stored on the device, and its operation goes before the punch', async () => {
      await company(true);
      const result = await service().timeIn(at('2026-10-26T00:00:00Z'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(takeSelfie).toHaveBeenCalledTimes(1);
      const photoId = result.punch.photoId!;
      expect(photoId).toMatch(/^[0-9a-f-]{36}$/);
      expect([...written.keys()]).toEqual([`photos/${OJT}/${photoId}.jpg`]);
      expect(written.get(`photos/${OJT}/${photoId}.jpg`)).toBe('/9j/4A==');
      const local = await TestBed.inject(LocalDbService).db();
      const outbox = await listOutbox(local, OJT);
      expect(outbox.map((op) => op.entity)).toEqual(['attachments', 'punches']);
      expect(outbox[0].payload).toEqual({ id: photoId, owner_id: OJT, report_id: null, storage_key: `${OJT}/${photoId}.jpg` });
      expect(await local.query('select upload_status, local_path, sync_status from attachments')).toEqual([
        { upload_status: 'local', local_path: `photos/${OJT}/${photoId}.jpg`, sync_status: 'pending' },
      ]);
    });

    it('TC-SI-FILE-01 (unit part): if the user closes the camera, the punch is not saved', async () => {
      await company(true);
      selfie = { ok: false, reason: 'cancelled' };
      expect(await service().timeIn(at('2026-10-26T00:00:00Z'))).toEqual({ ok: false, reason: 'photo-cancelled' });
      selfie = { ok: false, reason: 'denied' };
      expect(await service().timeIn(at('2026-10-26T00:00:00Z'))).toEqual({ ok: false, reason: 'photo-denied' });
      const local = await TestBed.inject(LocalDbService).db();
      expect(await listOutbox(local, OJT)).toEqual([]);
      expect(written.size).toBe(0);
    });

    it('TC-SI-FILE-01 (unit part): if the company does not require a photo, the camera does not open', async () => {
      await company(false);
      const result = await service().timeIn(at('2026-10-26T00:00:00Z'));
      expect(result.ok && result.punch.photoId).toBeNull();
      expect(takeSelfie).not.toHaveBeenCalled();
    });

    it('TC-SI-FILE-01 (unit part): the rule check comes first, so a rejected punch does not open the camera', async () => {
      await company(true);
      expect(await service().timeOut(at('2026-10-26T08:00:00Z'))).toEqual({ ok: false, reason: 'no-open-session' });
      expect(takeSelfie).not.toHaveBeenCalled();
    });
  });
});
