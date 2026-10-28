// The local database interface (layer 1). Repositories use only this interface (QR-FL-04).
// Implementations: Capacitor SQLite on mobile (capacitor-sqlite.db.ts), sql.js in tests (sqljs.db.ts).
// The admin web app has no local database (D-13).

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;

export interface LocalDb {
  /** Runs one or more statements without parameters, for example the schema. */
  execute(sql: string): Promise<void>;
  /** Runs one statement with parameters. */
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  /** Runs one query and gives the rows as objects. */
  query<T extends Row = Row>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  /** Runs `work` in one transaction. An error rolls back all its changes. */
  transaction<T>(work: (db: LocalDb) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** SQLite has no boolean type. Store booleans as 0 or 1. */
export const toSqlBool = (value: boolean): number => (value ? 1 : 0);
export const fromSqlBool = (value: SqlValue): boolean => value === 1 || value === '1';
