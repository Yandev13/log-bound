// Layer 2: the sync triggers, the retry delays, and the sync status for the pages
// (offline sync design, sections 6 and 13; FR-SYNC-02, FR-SYNC-04, FR-SYNC-08).
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { LocalDbService } from '../local-db/local-db.service';
import { APP_LIFECYCLE } from '../../plugins/app-lifecycle.plugin';
import { NETWORK } from '../../plugins/network.plugin';
import { retryDelayMs } from '../../shared/utils/retry';
import { countOutbox } from './outbox';
import { SyncDeps, SyncEngine, SyncOutcome } from './sync-engine';
import { FILE_UPLOADER } from './file-upload';
import { SYNC_TRANSPORT } from './sync-transport';

/** `unreachable`: the network is available, but the server does not answer (FR-SYNC-08). */
export type ConnectionState = 'online' | 'offline' | 'unreachable';

/** FR-SYNC-02: a sync every 5 minutes while the app is open. */
export const SYNC_INTERVAL_MS = 5 * 60_000;

/** The part of the engine that the service uses. Tests give a fake. */
export interface SyncRunner {
  requestSync(): Promise<void>;
  readonly lastOutcome: SyncOutcome | null;
}

export const SYNC_ENGINE_FACTORY = new InjectionToken<(deps: SyncDeps) => SyncRunner>('SYNC_ENGINE_FACTORY', {
  providedIn: 'root',
  factory: () => (deps) => new SyncEngine(deps),
});

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly local = inject(LocalDbService);
  private readonly network = inject(NETWORK);
  private readonly lifecycle = inject(APP_LIFECYCLE);
  private readonly transport = inject(SYNC_TRANSPORT);
  private readonly files = inject(FILE_UPLOADER);
  private readonly engineFactory = inject(SYNC_ENGINE_FACTORY);

  readonly connection = signal<ConnectionState>('online');
  readonly syncing = signal(false);
  /** The number of unsynced changes (FR-SYNC-04, QR-SF-01). */
  readonly unsynced = signal(0);
  /** The number of changes on the "Sync issues" screen (FR-SYNC-06). */
  readonly issues = signal(0);
  /** True when the server did not accept the session. AUTH then shows the login screen. The outbox stays. */
  readonly sessionRejected = signal(false);
  /** Goes up by one after each sync and each local change. Pages read the local data again when it changes. */
  readonly revision = signal(0);

  private userId: string | null = null;
  private engine: SyncRunner | null = null;
  private failures = 0;
  /** The last network state from the plugin. */
  private networkOnline = true;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private stops: (() => void)[] = [];

  /** Starts the sync for the logged-in OJT or facilitator. */
  async start(userId: string): Promise<void> {
    this.stop();
    this.userId = userId;
    this.sessionRejected.set(false);
    this.engine = this.engineFactory({
      db: () => this.local.db(),
      transport: this.transport,
      files: this.files,
      userId: () => this.userId,
    });
    this.networkOnline = await this.network.isOnline();
    this.connection.set(this.networkOnline ? 'online' : 'offline');
    this.stops.push(await this.network.onChange((online) => this.onNetworkChange(online)));
    this.stops.push(await this.lifecycle.onResume(() => void this.trigger()));
    this.intervalTimer = setInterval(() => void this.trigger(), SYNC_INTERVAL_MS);
    await this.refreshCounts();
    void this.trigger();
  }

  /** Stops all triggers, for example at logout. */
  stop(): void {
    this.stops.forEach((stopListener) => stopListener());
    this.stops = [];
    this.clearRetry();
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.userId = null;
    this.engine = null;
    this.failures = 0;
  }

  /** A local change was saved (section 6, trigger 3). */
  changed(): void {
    this.revision.update((n) => n + 1);
    void this.refreshCounts();
    void this.trigger();
  }

  /** Runs a sync now, for example for pull-to-refresh (FR-SYNC-03). */
  async trigger(): Promise<void> {
    const engine = this.engine;
    if (!engine || this.connection() === 'offline') {
      return;
    }
    this.clearRetry();
    this.syncing.set(true);
    try {
      await engine.requestSync();
    } finally {
      this.syncing.set(false);
    }
    if (engine !== this.engine) {
      return;
    }
    this.afterSync(engine.lastOutcome);
    await this.refreshCounts();
    this.revision.update((n) => n + 1);
  }

  private afterSync(outcome: SyncOutcome | null): void {
    if (!outcome || outcome.ok) {
      this.failures = 0;
      this.connection.set('online');
      return;
    }
    if (outcome.error === 'session') {
      this.sessionRejected.set(true);
      return;
    }
    // Section 13: no answer, a timeout, or a 5xx error. Keep the session and retry later (QR-RE-08).
    this.failures++;
    // A sync that fails because the network went away during it does not hide "No network".
    if (outcome.error === 'unreachable' && this.connection() !== 'offline') {
      this.connection.set('unreachable');
    }
    this.retryTimer = setTimeout(() => void this.trigger(), retryDelayMs(this.failures));
  }

  /**
   * Section 6: a network-online event resets the retry delay and starts a sync. Only a change counts: the Android
   * plugin sends "connected" again every few seconds with no change (DEF-011).
   */
  private onNetworkChange(online: boolean): void {
    if (online === this.networkOnline) {
      return;
    }
    this.networkOnline = online;
    this.clearRetry();
    this.failures = 0;
    this.connection.set(online ? 'online' : 'offline');
    if (online) {
      void this.trigger();
    }
  }

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private async refreshCounts(): Promise<void> {
    const userId = this.userId;
    if (!userId) {
      return;
    }
    const db = await this.local.db();
    this.unsynced.set(await countOutbox(db, userId));
    const rows = await db.query<{ n: number }>(
      "select count(*) as n from outbox where user_id = ? and status = 'issue'",
      [userId],
    );
    this.issues.set(Number(rows[0]?.n ?? 0));
  }
}
