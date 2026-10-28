// The header of each page: the title, the logout button, and the sync status bar (FR-SYNC-04).
// The logout shows the CAUTION with the count of unsynced changes (FR-AUTH-05, QR-SF-01, TC-ST-OJT-04).
// On mobile, the header also opens the notifications (FR-NOTI-05) and the profile (FR-PROF-01).
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonBadge,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  LoadingController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline, personCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';
import { LogoutService } from '../../core/auth/logout.service';
import { MockStore } from '../../data/mock/mock-store.service';
import { UI_STRINGS } from '../strings-ui';
import { SyncStatusBarComponent } from '../sync-status/sync-status-bar.component';
import { STRINGS } from '../strings';

addIcons({ notificationsOutline, personCircleOutline });

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonIcon, IonBadge, RouterLink, SyncStatusBarComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        @if (backHref()) {
          <ion-buttons slot="start">
            <ion-back-button [defaultHref]="backHref()" />
          </ion-buttons>
        }
        <ion-title>{{ title() }}</ion-title>
        <ion-buttons slot="end">
          @if (mobileRole()) {
            <ion-button routerLink="/notifications" [attr.aria-label]="ui.header.notifications">
              <ion-icon slot="icon-only" name="notifications-outline" />
              @if (mock.unreadCount() > 0) {
                <ion-badge color="danger" class="count">{{ mock.unreadCount() }}</ion-badge>
              }
            </ion-button>
            <ion-button routerLink="/profile" [attr.aria-label]="ui.header.profile">
              <ion-icon slot="icon-only" name="person-circle-outline" />
            </ion-button>
          }
          <ion-button [disabled]="busy()" (click)="logout()">{{ strings.logout }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <app-sync-status-bar />
    </ion-header>
  `,
  styles: `
    .count {
      position: absolute;
      top: 2px;
      right: 0;
      font-size: 0.6em;
      min-width: 16px;
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  /** If given, the header shows a back button to this URL. */
  readonly backHref = input<string | null>(null);

  protected readonly strings = STRINGS;
  protected readonly ui = UI_STRINGS;
  protected readonly busy = signal(false);
  protected readonly mock = inject(MockStore);
  private readonly role = inject(AuthService).role;
  protected readonly mobileRole = computed(() => this.role() === 'ojt' || this.role() === 'facilitator');
  private readonly logouts = inject(LogoutService);
  private readonly alerts = inject(AlertController);
  private readonly loadings = inject(LoadingController);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    this.busy.set(true);
    try {
      const unsynced = await this.logouts.unsyncedBeforeLogout();
      if (unsynced > 0 && !(await this.confirmLoss(unsynced))) {
        return;
      }
      // The page must not take taps while the local data is removed (DEF-014).
      const blocker = await this.loadings.create({ message: this.strings.loggingOut });
      await blocker.present();
      try {
        if (await this.logouts.logout(unsynced > 0)) {
          await this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      } finally {
        await blocker.dismiss();
      }
    } finally {
      this.busy.set(false);
    }
  }

  private async confirmLoss(count: number): Promise<boolean> {
    const c = STRINGS.logoutCaution;
    const alert = await this.alerts.create({
      header: c.header,
      message: c.message(count),
      buttons: [
        { text: c.cancel, role: 'cancel' },
        { text: c.confirm, role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }
}
