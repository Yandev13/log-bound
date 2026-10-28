// Local database adapter for the mobile app: @capacitor-community/sqlite (layer 1).
// Code other than this file and the plugin wrappers must not import the plugin (frontend rule 5).
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { LocalDb, Row, SqlValue } from './local-db';

export const LOCAL_DB_NAME = 'ojtdtr';

export class CapacitorSqliteDb implements LocalDb {
  private inTransaction = false;

  private constructor(
    private readonly sqlite: SQLiteConnection,
    private readonly conn: SQLiteDBConnection,
  ) {}

  /** Opens (and makes, if necessary) the database file. QR-SE-10 (encryption) is "Could": not used. */
  static async open(name = LOCAL_DB_NAME): Promise<CapacitorSqliteDb> {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const consistent = (await sqlite.checkConnectionsConsistency()).result;
    const exists = (await sqlite.isConnection(name, false)).result;
    const conn =
      consistent && exists
        ? await sqlite.retrieveConnection(name, false)
        : await sqlite.createConnection(name, false, 'no-encryption', 1, false);
    await conn.open();
    return new CapacitorSqliteDb(sqlite, conn);
  }

  async execute(sql: string): Promise<void> {
    await this.conn.execute(sql, !this.inTransaction);
  }

  async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    await this.conn.run(sql, [...params], !this.inTransaction);
  }

  async query<T extends Row = Row>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    const result = await this.conn.query(sql, [...params]);
    return (result.values ?? []) as T[];
  }

  async transaction<T>(work: (db: LocalDb) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      return work(this);
    }
    this.inTransaction = true;
    await this.conn.beginTransaction();
    try {
      const result = await work(this);
      await this.conn.commitTransaction();
      return result;
    } catch (error) {
      await this.conn.rollbackTransaction();
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }

  async close(): Promise<void> {
    await this.sqlite.closeConnection(LOCAL_DB_NAME, false);
  }
}
