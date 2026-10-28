// FR-SYNC-04 and FR-SYNC-08: the network status and the number of unsynced changes, on each mobile page.
// "Server not reachable" is different from "No network". The issue count opens the "Sync issues" screen.
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, cloudDoneOutline, cloudOfflineOutline, warningOutline } from 'ionicons/icons';
import { PlatformService } from '../../core/platform.service';
import { SyncService } from '../../data/sync/sync.service';
import { STRINGS } from '../strings';

addIcons({ alertCircleOutline, cloudDoneOutline, cloudOfflineOutline, warningOutline });

const ICONS = { online: 'cloud-done-outline', offline: 'cloud-offline-outline', unreachable: 'warning-outline' } as const;

@Component({
  selector: 'app-sync-status-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonSpinner, RouterLink],
  template: `
    @if (mobile) {
      <div class="bar" [class]="sync.connection()" role="status" aria-live="polite">
        <span class="state">
          <ion-icon aria-hidden="true" [name]="icon()" />
          {{ text[sync.connection()] }}
        </span>
        <span class="count">
          @if (sync.syncing()) {
            <ion-spinner name="dots" aria-hidden="true" />
            {{ text.syncing }}
          } @else if (sync.unsynced() === 0) {
            {{ text.allSynced }}
          } @else {
            {{ text.unsynced(sync.unsynced()) }}
          }
        </span>
        @if (sync.issues() > 0) {
          <a class="issues" routerLink="/sync-issues">
            <ion-icon aria-hidden="true" name="alert-circle-outline" />
            {{ text.issues(sync.issues()) }}
          </a>
        }
      </div>
    }
  `,
  styles: `
    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      align-items: center;
      padding: 6px 16px;
      font-size: 0.85rem;
      background: var(--ion-color-success-tint);
      color: var(--ion-color-success-contrast);
    }
    .bar.offline {
      background: var(--ion-color-medium-tint);
      color: var(--ion-color-medium-contrast);
    }
    .bar.unreachable {
      background: var(--ion-color-warning-tint);
      color: var(--ion-color-warning-contrast);
    }
    .state,
    .count,
    .issues {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .state {
      font-weight: 600;
    }
    ion-spinner {
      width: 16px;
      height: 16px;
    }
    .issues {
      margin-left: auto;
      color: var(--ion-color-danger-shade);
      font-weight: 600;
    }
  `,
})
export class SyncStatusBarComponent {
  protected readonly sync = inject(SyncService);
  protected readonly mobile = inject(PlatformService).platform === 'mobile';
  protected readonly text = STRINGS.sync;
  protected readonly icon = computed(() => ICONS[this.sync.connection()]);
}
