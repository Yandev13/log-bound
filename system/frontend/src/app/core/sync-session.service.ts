// Starts the sync when an OJT or facilitator is logged in on the mobile app, and stops it at logout
// (FR-SYNC-02). If the server does not accept the session, the app shows the login screen. The outbox stays
// (offline sync design, section 9, item 3).
import { Injectable, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { SyncService } from '../data/sync/sync.service';
import { AuthService } from './auth/auth.service';
import { PlatformService } from './platform.service';

@Injectable({ providedIn: 'root' })
export class SyncSessionService {
  private readonly auth = inject(AuthService);
  private readonly sync = inject(SyncService);
  private readonly router = inject(Router);
  private readonly mobile = inject(PlatformService).platform === 'mobile';
  private userId: string | null = null;

  constructor() {
    effect(() => {
      const profile = this.auth.profile();
      const id = this.mobile && profile && profile.role !== 'admin' ? profile.id : null;
      untracked(() => this.follow(id));
    });
    effect(() => {
      if (this.sync.sessionRejected()) {
        untracked(() => void this.endRejectedSession());
      }
    });
  }

  private follow(id: string | null): void {
    if (id === this.userId) {
      return;
    }
    this.userId = id;
    if (id) {
      void this.sync.start(id);
    } else {
      this.sync.stop();
    }
  }

  private async endRejectedSession(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
