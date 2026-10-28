// Layer 2: removes the local data of a user, for logout and "clear data" (QR-SF-01, QR-SF-03).
// Records that the server does not have yet are never removed without the confirmation flag (TC-U-SYNC-06).
// The unsynced records of a different user on the same device always stay (offline sync design 9.5).
import { LocalDb } from '../local-db/local-db';
import { PULLED_ENTITIES } from './local-merge';
import { countOutbox } from './outbox';

export class UnsyncedDataError extends Error {
  constructor(readonly count: number) {
    super(`${count} unsynced changes. Confirm to discard them.`);
    this.name = 'UnsyncedDataError';
  }
}

/** Unsynced records with no outbox operation of any user (for example after an app stop). They count for the user. */
const ORPHAN = (table: string) =>
  `sync_status <> 'synced' and id not in (select entity_id from outbox where entity = '${table}')`;

/** The number of changes of the user that the server does not have yet. */
export async function unsyncedCount(db: LocalDb, userId: string): Promise<number> {
  let total = await countOutbox(db, userId);
  for (const table of PULLED_ENTITIES) {
    const rows = await db.query<{ n: number }>(`select count(*) as n from ${table} where ${ORPHAN(table)}`);
    total += Number(rows[0]?.n ?? 0);
  }
  return total;
}

/**
 * Removes the synced local data and the pull cursors. If the user has unsynced changes, it removes
 * nothing and throws `UnsyncedDataError`, unless `discardUnsynced` is true (the user confirmed the CAUTION).
 * Then it also removes the unsynced records and the outbox of the user.
 */
export async function clearLocalData(db: LocalDb, userId: string, opts: { discardUnsynced: boolean }): Promise<void> {
  const unsynced = await unsyncedCount(db, userId);
  if (unsynced > 0 && !opts.discardUnsynced) {
    throw new UnsyncedDataError(unsynced);
  }
  await db.transaction(async (tx) => {
    for (const table of PULLED_ENTITIES) {
      await tx.run(`delete from ${table} where sync_status = 'synced'`);
      if (unsynced > 0) {
        await tx.run(`delete from ${table} where ${ORPHAN(table)}`);
        await tx.run(`delete from ${table} where id in (select entity_id from outbox where user_id = ? and entity = ?)`, [
          userId,
          table,
        ]);
      }
    }
    await tx.run('delete from outbox where user_id = ?', [userId]);
    await tx.run('delete from user_profile where id = ?', [userId]);
    // The synced rows of all users are gone. Each user must pull again from the start.
    await tx.run("delete from sync_state where key like 'pull_cursor:%' or key like 'epoch:%'");
  });
}
