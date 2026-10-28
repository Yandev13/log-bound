// The active assignments of a facilitator, from the local copy of the pulled data (FR-DTR-10, offline).
// The pull gives only the OJTs in the scope of the facilitator (RLS, API contract 5.2).
import { Injectable, inject } from '@angular/core';
import { LocalDbService } from '../local-db/local-db.service';

export interface AssignedOjt {
  ojtId: string;
  fullName: string;
  companyName: string;
}

interface AssignedRow {
  [key: string]: string | number | null;
  ojt_id: string;
  full_name: string | null;
  company_name: string | null;
}

@Injectable({ providedIn: 'root' })
export class AssignmentRepository {
  private readonly local = inject(LocalDbService);

  /** The OJTs of the facilitator, by name. A missing profile or company shows as an empty name. */
  async ojtsOf(facilitatorId: string): Promise<AssignedOjt[]> {
    const db = await this.local.db();
    const rows = await db.query<AssignedRow>(
      `select a.ojt_id, p.full_name, c.name as company_name
         from ojt_assignments a
         left join profiles p on p.id = a.ojt_id
         left join companies c on c.id = a.company_id
        where a.facilitator_id = ? and a.active = 1 and a.deleted_at is null
        order by p.full_name collate nocase, a.ojt_id`,
      [facilitatorId],
    );
    return rows.map((r) => ({ ojtId: r.ojt_id, fullName: r.full_name ?? '', companyName: r.company_name ?? '' }));
  }

  /**
   * FR-DTR-05: true if the company of the active assignment of the OJT requires a photo for each punch.
   * False if the device has no assignment or company data yet (no pull since the first login).
   */
  async photoRequired(ojtId: string): Promise<boolean> {
    const db = await this.local.db();
    const rows = await db.query<{ photo_required: number }>(
      `select c.photo_required
         from ojt_assignments a
         join companies c on c.id = a.company_id and c.deleted_at is null
        where a.ojt_id = ? and a.active = 1 and a.deleted_at is null
        limit 1`,
      [ojtId],
    );
    return rows[0]?.photo_required === 1;
  }

  /** The assigned OJT, or null if the OJT is not an active OJT of this facilitator. */
  async ojtOf(facilitatorId: string, ojtId: string): Promise<AssignedOjt | null> {
    return (await this.ojtsOf(facilitatorId)).find((o) => o.ojtId === ojtId) ?? null;
  }
}
