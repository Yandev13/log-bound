// Layer 2: writes server records to the local database (offline sync design, sections 4 and 5).
// The local tables use the server column names. Columns that the local table does not have are ignored.
import { LocalDb, SqlValue } from '../local-db/local-db';

/** The local tables that the pull fills (API contract, section 5.2). */
export const PULLED_ENTITIES = [
  'profiles', 'companies', 'batches', 'ojt_assignments', 'punches', 'weekly_reports',
  'report_events', 'correction_requests', 'attachments', 'notifications',
] as const;

export type MergeOutcome = 'written' | 'kept-local' | 'deleted' | 'ignored';

const columnCache = new WeakMap<LocalDb, Map<string, Set<string>>>();

async function columnsOf(db: LocalDb, table: string): Promise<Set<string>> {
  let tables = columnCache.get(db);
  if (!tables) {
    tables = new Map();
    columnCache.set(db, tables);
  }
  let columns = tables.get(table);
  if (!columns) {
    const rows = await db.query<{ name: string }>(`pragma table_info(${table})`);
    columns = new Set(rows.map((r) => r.name));
    tables.set(table, columns);
  }
  return columns;
}

function toSql(value: unknown): SqlValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function isPulled(entity: string): boolean {
  return (PULLED_ENTITIES as readonly string[]).includes(entity);
}

/** Writes the server copy with sync status `synced`. A tombstone removes the local row. */
async function writeSynced(db: LocalDb, entity: string, data: Record<string, unknown>): Promise<MergeOutcome> {
  const id = String(data['id']);
  if (data['deleted_at']) {
    await db.run(`delete from ${entity} where id = ?`, [id]);
    return 'deleted';
  }
  const columns = await columnsOf(db, entity);
  const names = Object.keys(data).filter((k) => columns.has(k) && k !== 'sync_status');
  const values = names.map((k) => toSql(data[k]));
  const updates = [...names.filter((k) => k !== 'id').map((k) => `${k} = excluded.${k}`), "sync_status = 'synced'"];
  await db.run(
    `insert into ${entity} (${names.join(', ')}, sync_status) values (${names.map(() => '?').join(', ')}, 'synced')
     on conflict (id) do update set ${updates.join(', ')}`,
    values,
  );
  return 'written';
}

/**
 * Pull merge rule (section 5, step 4; TC-U-SYNC-05). A local record with status `pending` or `issue` stays.
 * Else the server copy replaces it.
 */
export async function mergePulled(db: LocalDb, entity: string, data: Record<string, unknown>): Promise<MergeOutcome> {
  if (!isPulled(entity) || typeof data['id'] !== 'string') {
    return 'ignored';
  }
  const local = await db.query<{ sync_status: string }>(`select sync_status from ${entity} where id = ?`, [data['id']]);
  if (local[0] && local[0].sync_status !== 'synced') {
    return 'kept-local';
  }
  return writeSynced(db, entity, data);
}

/** After `applied` or `duplicate`: the server copy is the local copy now (section 4, step 5). */
export async function markSynced(db: LocalDb, entity: string, id: string, record: Record<string, unknown> | null): Promise<void> {
  if (!isPulled(entity)) {
    return;
  }
  if (record && typeof record['id'] === 'string') {
    await writeSynced(db, entity, record);
  } else {
    await db.run(`update ${entity} set sync_status = 'synced' where id = ?`, [id]);
  }
}

/** After `rejected` or `conflict`: the record shows on the "Sync issues" screen (section 4, step 6). */
export async function markIssue(db: LocalDb, entity: string, id: string): Promise<void> {
  if (isPulled(entity)) {
    await db.run(`update ${entity} set sync_status = 'issue' where id = ?`, [id]);
  }
}
