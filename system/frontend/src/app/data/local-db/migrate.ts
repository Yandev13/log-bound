// Applies the local migrations that the database does not have yet (TC-CI-DB-01).
// The schema version is in `PRAGMA user_version`. A second run makes no change.
import { LocalDb } from './local-db';
import { LOCAL_MIGRATIONS, LocalMigration } from './schema';

export async function schemaVersion(db: LocalDb): Promise<number> {
  const rows = await db.query<{ user_version: number }>('pragma user_version');
  return Number(rows[0]?.user_version ?? 0);
}

/** Gives the versions that this call applied. An empty list means that the schema was current. */
export async function migrate(
  db: LocalDb,
  migrations: readonly LocalMigration[] = LOCAL_MIGRATIONS,
): Promise<number[]> {
  const current = await schemaVersion(db);
  const applied: number[] = [];
  for (const m of migrations.filter((x) => x.version > current).sort((a, b) => a.version - b.version)) {
    // Each migration and its version change are one transaction. A failure leaves the old version.
    await db.transaction(async (tx) => {
      await tx.execute(m.sql);
      await tx.execute(`pragma user_version = ${Number(m.version)}`);
    });
    applied.push(m.version);
  }
  return applied;
}
