// Layer 2: the last 200 sync events, for fault analysis (offline sync design, section 2; QR-MA-03).
import { LocalDb } from '../local-db/local-db';
import { nowIso } from '../../shared/utils/uuid';

export const SYNC_LOG_SIZE = 200;

export async function logSync(db: LocalDb, kind: string, detail: unknown = null): Promise<void> {
  await db.run('insert into sync_log (at, kind, detail) values (?, ?, ?)', [
    nowIso(),
    kind,
    detail === null ? null : JSON.stringify(detail),
  ]);
  await db.run(
    'delete from sync_log where id <= (select max(id) from sync_log) - ?',
    [SYNC_LOG_SIZE],
  );
}
