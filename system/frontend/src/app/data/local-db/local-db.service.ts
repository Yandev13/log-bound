// Opens the local database one time and applies the migrations. Mobile only (D-13).
import { Injectable, InjectionToken, inject } from '@angular/core';
import { PlatformService } from '../../core/platform.service';
import { CapacitorSqliteDb } from './capacitor-sqlite.db';
import { LocalDb } from './local-db';
import { migrate } from './migrate';

/** Opens the database. Tests replace it with an opener for the sql.js adapter. */
export const LOCAL_DB_OPENER = new InjectionToken<() => Promise<LocalDb>>('LOCAL_DB_OPENER', {
  providedIn: 'root',
  factory: () => () => CapacitorSqliteDb.open(),
});

@Injectable({ providedIn: 'root' })
export class LocalDbService {
  private readonly opener = inject(LOCAL_DB_OPENER);
  private readonly platform = inject(PlatformService).platform;
  private opening: Promise<LocalDb> | null = null;

  /** True on the mobile app. The admin web app has no local database. */
  get available(): boolean {
    return this.platform === 'mobile';
  }

  db(): Promise<LocalDb> {
    if (!this.available) {
      return Promise.reject(new Error('The local database is only on the mobile app (D-13).'));
    }
    this.opening ??= this.opener().then(async (db) => {
      await migrate(db);
      return db;
    });
    // If the open fails, try again at the next call.
    this.opening.catch(() => (this.opening = null));
    return this.opening;
  }
}
