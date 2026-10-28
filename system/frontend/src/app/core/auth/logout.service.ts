// FR-AUTH-05 and QR-SF-01: logout with the unsynced-changes CAUTION (offline sync design, section 9).
// The page asks `unsyncedBeforeLogout()` first. If the count is not 0, it shows the CAUTION and calls
// `logout(true)` only after the user confirms.
import { Injectable, inject } from '@angular/core';
import { LocalDbService } from '../../data/local-db/local-db.service';
import { AttachmentRepository } from '../../data/repositories/attachment.repository';
import { UnsyncedDataError, clearLocalData, unsyncedCount } from '../../data/sync/local-data';
import { SyncService } from '../../data/sync/sync.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class LogoutService {
  private readonly auth = inject(AuthService);
  private readonly sync = inject(SyncService);
  private readonly local = inject(LocalDbService);
  private readonly attachments = inject(AttachmentRepository);

  /** Tries one sync (if online), then gives the number of unsynced changes. Always 0 on the admin web app. */
  async unsyncedBeforeLogout(): Promise<number> {
    const userId = this.auth.profile()?.id;
    if (!userId || !this.local.available) {
      return 0;
    }
    await this.sync.trigger().catch(() => undefined);
    try {
      return unsyncedCount(await this.local.db(), userId);
    } catch {
      // The local database did not open. There is no local data to lose, so the logout can continue.
      return 0;
    }
  }

  /**
   * Removes the local data of the user and ends the session. Gives false and changes nothing if unsynced
   * changes exist and `discardUnsynced` is false (QR-SF-03).
   */
  async logout(discardUnsynced: boolean): Promise<boolean> {
    const userId = this.auth.profile()?.id;
    if (userId && this.local.available) {
      try {
        await clearLocalData(await this.local.db(), userId, { discardUnsynced });
        // The photo records are gone, so the photo files of the user go too (QR-SF-01).
        await this.attachments.removeFilesOf(userId);
      } catch (error) {
        if (error instanceof UnsyncedDataError) {
          return false;
        }
        // The local database did not open. The data stays, and the logout continues.
      }
    }
    this.sync.stop();
    await this.auth.signOut();
    return true;
  }
}
