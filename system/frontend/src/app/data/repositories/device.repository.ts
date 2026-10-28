// Device values for a new punch (FR-DTR-03, offline sync design section 8): the install ID and the last
// known clock offset. The sync engine stores the offset at each sync (TC-U-SYNC-07).
import { Injectable, inject } from '@angular/core';
import { LocalDbService } from '../local-db/local-db.service';
import { clockOffsetS, deviceId } from '../sync/sync-state';

export interface DeviceContext {
  deviceId: string;
  clockOffsetS: number | null;
}

@Injectable({ providedIn: 'root' })
export class DeviceRepository {
  private readonly local = inject(LocalDbService);

  async context(): Promise<DeviceContext> {
    const db = await this.local.db();
    return { deviceId: await deviceId(db), clockOffsetS: await clockOffsetS(db) };
  }
}
