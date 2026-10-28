// Punch repository: the only path to punch data (frontend rule 3).
// A new punch goes to the local database and the outbox in one transaction (FR-SYNC-01, D-05).
// The DTR rules (FR-DTR-08 and others) are in the DTR service (layer 4), not here.
import { Injectable, inject } from '@angular/core';
import { LocalDb, Row, fromSqlBool, toSqlBool } from '../local-db/local-db';
import { LocalDbService } from '../local-db/local-db.service';
import { enqueue } from '../sync/outbox';
import { createPayload } from '../sync/payloads';
import { LocalPhoto, insertPhoto } from './attachment.repository';

export type SyncStatus = 'pending' | 'synced' | 'issue';

export interface NewPunch {
  id: string;
  ojtId: string;
  type: 'in' | 'out';
  deviceTime: string;
  timeZone: string;
  clockOffsetS: number | null;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  photoId: string | null;
  deviceId: string;
  correctsPunchId: string | null;
}

export interface Punch extends NewPunch {
  serverReceivedAt: string | null;
  doubtfulTime: boolean;
  approved: boolean;
  version: number;
  syncStatus: SyncStatus;
}

interface PunchRow {
  [key: string]: string | number | null;
  id: string;
  ojt_id: string;
  type: string;
  device_time: string;
  time_zone: string;
  clock_offset_s: number | null;
  server_received_at: string | null;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  photo_id: string | null;
  device_id: string;
  corrects_punch_id: string | null;
  doubtful_time: number;
  approved: number;
  version: number;
  sync_status: string;
}

/** The columns of a new punch, with the server names. */
function rowOf(p: NewPunch): Row {
  return {
    id: p.id,
    ojt_id: p.ojtId,
    type: p.type,
    device_time: p.deviceTime,
    time_zone: p.timeZone,
    clock_offset_s: p.clockOffsetS,
    lat: p.lat,
    lng: p.lng,
    accuracy_m: p.accuracyM,
    photo_id: p.photoId,
    device_id: p.deviceId,
    corrects_punch_id: p.correctsPunchId,
  };
}

function fromRow(r: PunchRow): Punch {
  return {
    id: r.id,
    ojtId: r.ojt_id,
    type: r.type === 'out' ? 'out' : 'in',
    deviceTime: r.device_time,
    timeZone: r.time_zone,
    clockOffsetS: r.clock_offset_s,
    lat: r.lat,
    lng: r.lng,
    accuracyM: r.accuracy_m,
    photoId: r.photo_id,
    deviceId: r.device_id,
    correctsPunchId: r.corrects_punch_id,
    serverReceivedAt: r.server_received_at,
    doubtfulTime: fromSqlBool(r.doubtful_time),
    approved: fromSqlBool(r.approved),
    version: r.version,
    syncStatus: r.sync_status as SyncStatus,
  };
}

@Injectable({ providedIn: 'root' })
export class PunchRepository {
  private readonly local = inject(LocalDbService);

  /**
   * Saves a new punch with sync status `pending` and adds one `create` operation to the outbox.
   * A photo (FR-DTR-05) gets its record and operation in the same transaction, before the punch operation.
   */
  async saveNew(punch: NewPunch, userId: string, photo: LocalPhoto | null = null): Promise<Punch> {
    const db = await this.local.db();
    await db.transaction(async (tx: LocalDb) => {
      if (photo) {
        await insertPhoto(tx, photo, userId);
      }
      await tx.run(
        `insert into punches (id, ojt_id, type, device_time, time_zone, clock_offset_s, lat, lng, accuracy_m,
           photo_id, device_id, corrects_punch_id, doubtful_time, approved, version, sync_status)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
        [
          punch.id,
          punch.ojtId,
          punch.type,
          punch.deviceTime,
          punch.timeZone,
          punch.clockOffsetS,
          punch.lat,
          punch.lng,
          punch.accuracyM,
          punch.photoId,
          punch.deviceId,
          punch.correctsPunchId,
          toSqlBool(false),
          toSqlBool(false),
        ],
      );
      await enqueue(tx, { userId, entity: 'punches', entityId: punch.id, opType: 'create', payload: createPayload('punches', rowOf(punch)) });
    });
    const saved = await this.getById(punch.id);
    if (!saved) {
      throw new Error(`Punch ${punch.id} was not saved.`);
    }
    return saved;
  }

  async getById(id: string): Promise<Punch | null> {
    const db = await this.local.db();
    const rows = await db.query<PunchRow>('select * from punches where id = ? and deleted_at is null', [id]);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  /**
   * The punch that was recorded last (D-51): synced punches in the order that the server received them, then the
   * unsynced punches in the order that this device saved them. The device time is not used, because the device
   * clock can be wrong (QR-SF-02).
   */
  async lastRecorded(ojtId: string): Promise<Punch | null> {
    const db = await this.local.db();
    const rows = await db.query<PunchRow>(
      `select * from punches where ojt_id = ? and deleted_at is null
        order by server_received_at is null desc, server_received_at desc, rowid desc
        limit 1`,
      [ojtId],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  /** The punches of one OJT in time order (FR-DTR-07). */
  async listByOjt(ojtId: string): Promise<Punch[]> {
    const db = await this.local.db();
    const rows = await db.query<PunchRow>(
      'select * from punches where ojt_id = ? and deleted_at is null order by device_time, rowid',
      [ojtId],
    );
    return rows.map(fromRow);
  }
}
