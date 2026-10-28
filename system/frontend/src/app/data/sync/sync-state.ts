// Layer 2: values of the sync engine in the local table `sync_state` (offline sync design, sections 2, 8, 12).
import { LocalDb } from '../local-db/local-db';
import { newId } from '../../shared/utils/uuid';

export async function getState(db: LocalDb, key: string): Promise<string | null> {
  const rows = await db.query<{ value: string | null }>('select value from sync_state where key = ?', [key]);
  return rows[0]?.value ?? null;
}

export async function setState(db: LocalDb, key: string, value: string | null): Promise<void> {
  await db.run(
    'insert into sync_state (key, value) values (?, ?) on conflict (key) do update set value = excluded.value',
    [key, value],
  );
}

/** Keys that belong to one user. The pull cursor and epoch are for each user (offline sync design 9.5). */
export const userKey = {
  cursor: (userId: string) => `pull_cursor:${userId}`,
  epoch: (userId: string) => `epoch:${userId}`,
  lastSyncAt: (userId: string) => `last_sync_at:${userId}`,
};

const DEVICE_ID = 'device_id';
const CLOCK_OFFSET = 'clock_offset_s';

/** The ID of this app install (FR-DTR-03). It is made one time and does not change. */
export async function deviceId(db: LocalDb): Promise<string> {
  const known = await getState(db, DEVICE_ID);
  if (known) {
    return known;
  }
  const id = newId();
  await setState(db, DEVICE_ID, id);
  return id;
}

/** The last known `server_time - device_time` in seconds, or null before the first sync (section 8). */
export async function clockOffsetS(db: LocalDb): Promise<number | null> {
  const value = await getState(db, CLOCK_OFFSET);
  return value === null ? null : Number(value);
}

export async function setClockOffsetS(db: LocalDb, seconds: number): Promise<void> {
  await setState(db, CLOCK_OFFSET, String(Math.round(seconds)));
}
