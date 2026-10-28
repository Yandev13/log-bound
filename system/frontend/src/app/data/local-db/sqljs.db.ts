// In-memory SQLite adapter for tests (test plan, section 3.3, layer 1; QR-FL-04).
// It uses sql.js (SQLite compiled to WebAssembly), so that the tests run the real SQL of the app.
import initSqlJs, { Database } from 'sql.js';
import { LocalDb, Row, SqlValue } from './local-db';

export class SqlJsDb implements LocalDb {
  private inTransaction = false;

  private constructor(private readonly db: Database) {}

  static async create(): Promise<SqlJsDb> {
    const SQL = await initSqlJs();
    return new SqlJsDb(new SQL.Database());
  }

  async execute(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    this.db.run(sql, [...params]);
  }

  async query<T extends Row = Row>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql, [...params]);
    const rows: T[] = [];
    try {
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
    } finally {
      stmt.free();
    }
    return rows;
  }

  async transaction<T>(work: (db: LocalDb) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      return work(this);
    }
    this.inTransaction = true;
    this.db.exec('begin');
    try {
      const result = await work(this);
      this.db.exec('commit');
      return result;
    } catch (error) {
      this.db.exec('rollback');
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
