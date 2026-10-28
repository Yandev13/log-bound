// Layer 2: the payload of a `create` operation, made from a local row (API contract, section 5.1).
// The repositories use it for new records. The sync engine uses it to send records again after an
// epoch change (offline sync design, section 12). Local-only columns are not sent.
import { Row } from '../local-db/local-db';

/**
 * The columns that the client sends for each entity. The server sets all other columns.
 * `attachments` is first, so that an epoch change sends a photo before the punch that refers to it.
 */
export const PAYLOAD_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  attachments: ['id', 'owner_id', 'report_id', 'storage_key'],
  punches: [
    'id', 'ojt_id', 'type', 'device_time', 'time_zone', 'clock_offset_s',
    'lat', 'lng', 'accuracy_m', 'photo_id', 'device_id', 'corrects_punch_id',
  ],
  weekly_reports: ['id', 'ojt_id', 'week_start', 'tasks_done', 'skills_learned', 'problems', 'next_plans'],
};

/** The entities that the client can create. Their records are sent again after an epoch change. */
export const OWN_ENTITIES = Object.keys(PAYLOAD_COLUMNS);

export function createPayload(entity: string, row: Row): Record<string, unknown> {
  const columns = PAYLOAD_COLUMNS[entity];
  if (!columns) {
    throw new Error(`No payload for entity ${entity}`);
  }
  return Object.fromEntries(columns.map((c) => [c, row[c] ?? null]));
}
