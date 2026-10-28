import { TestBed } from '@angular/core/testing';
import { PlatformService } from '../../core/platform.service';
import { LocalDb } from '../local-db/local-db';
import { LOCAL_DB_OPENER, LocalDbService } from '../local-db/local-db.service';
import { SqlJsDb } from '../local-db/sqljs.db';
import { mergePulled } from '../sync/local-merge';
import { AssignmentRepository } from './assignment.repository';

const FAC = 'fac-1';

describe('Assigned OJTs of a facilitator (FR-DTR-10)', () => {
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
    // The data as the pull stores it (API contract 5.2).
    const local = await TestBed.inject(LocalDbService).db();
    const assignment = (id: string, ojt: string, fac: string, active: boolean) =>
      mergePulled(local, 'ojt_assignments', { id, ojt_id: ojt, facilitator_id: fac, company_id: 'c1', batch_id: 'b1', active, version: 1, deleted_at: null });
    await mergePulled(local, 'companies', { id: 'c1', name: 'Company A', address: '', photo_required: false, location_required: false, version: 1 });
    await mergePulled(local, 'profiles', { id: 'o2', role: 'ojt', full_name: 'Bea', status: 'active', version: 1 });
    await mergePulled(local, 'profiles', { id: 'o1', role: 'ojt', full_name: 'ana', status: 'active', version: 1 });
    await assignment('a1', 'o1', FAC, true);
    await assignment('a2', 'o2', FAC, true);
    await assignment('a3', 'o3', FAC, false);
    await assignment('a4', 'o4', 'fac-2', true);
  });
  afterEach(async () => {
    await db.close();
  });

  it('TC-ST-FAC-01 (unit part): the list has only the active OJTs of the facilitator, by name', async () => {
    const list = await TestBed.inject(AssignmentRepository).ojtsOf(FAC);
    expect(list).toEqual([
      { ojtId: 'o1', fullName: 'ana', companyName: 'Company A' },
      { ojtId: 'o2', fullName: 'Bea', companyName: 'Company A' },
    ]);
  });

  it('TC-ST-FAC-01 (unit part): an OJT that is not an active OJT of the facilitator gives null', async () => {
    const repo = TestBed.inject(AssignmentRepository);
    expect(await repo.ojtOf(FAC, 'o1')).toMatchObject({ fullName: 'ana' });
    expect(await repo.ojtOf(FAC, 'o3')).toBeNull();
    expect(await repo.ojtOf(FAC, 'o4')).toBeNull();
  });

  it('TC-SI-FILE-01 (unit part): the photo setting comes from the company of the active assignment (FR-DTR-05)', async () => {
    const local = await TestBed.inject(LocalDbService).db();
    const repo = TestBed.inject(AssignmentRepository);
    expect(await repo.photoRequired('o1')).toBe(false);
    await mergePulled(local, 'companies', { id: 'c1', name: 'Company A', address: '', photo_required: true, location_required: false, version: 2 });
    expect(await repo.photoRequired('o1')).toBe(true);
    // o3 has only an assignment that ended. o9 has no data on the device.
    expect(await repo.photoRequired('o3')).toBe(false);
    expect(await repo.photoRequired('o9')).toBe(false);
  });
});
