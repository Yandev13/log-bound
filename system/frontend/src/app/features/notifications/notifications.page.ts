// Notifications list for OJT and facilitator (FR-NOTI-05).
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonItem, IonLabel, IonList, IonNote, IonSegment, IonSegmentButton } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { homePath } from '../../core/auth/access';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { STRINGS } from '../../shared/strings';
import { FAC_STRINGS } from '../../shared/strings-fac';
import { UI_STRINGS } from '../../shared/strings-ui';
import { dateLabel, timeOfDay } from '../../shared/utils/format';
import { localDate } from '../../shared/utils/hours';

type Filter = 'all' | 'unread';

@Component({
  selector: 'app-notifications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonButton, IonList, IonItem, IonLabel, IonNote, IonSegment, IonSegmentButton],
  template: `
    <app-page-header [title]="strings.pages.notifications" [backHref]="home()" />
    <ion-content>
      <div class="ion-padding">
        <ion-segment [value]="filter()" (ionChange)="filter.set($any($event).detail.value)">
          <ion-segment-button value="all"><ion-label>{{ text.all }}</ion-label></ion-segment-button>
          <ion-segment-button value="unread"><ion-label>{{ text.unread }}</ion-label></ion-segment-button>
        </ion-segment>
        <ion-button class="gap" fill="outline" [disabled]="store.unreadCount() === 0" (click)="store.markAllRead()">{{ text.markAll }}</ion-button>
      </div>
      @if (items().length === 0) {
        <p class="ion-padding">{{ filter() === 'all' ? text.empty : text.emptyUnread }}</p>
      }
      <ion-list>
        @for (n of items(); track n.id) {
          <ion-item button detail (click)="open(n.id, n.link)">
            @if (!n.read) {
              <span slot="start" class="dot" [attr.aria-label]="text.unreadMark"></span>
            }
            <ion-label class="ion-text-wrap">
              <h2 [class.unread]="!n.read">{{ n.title }}</h2>
              <p>{{ n.body }}</p>
              <p>{{ n.when }}</p>
            </ion-label>
          </ion-item>
        }
      </ion-list>
      <ion-note class="ion-padding ion-text-center note">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
    styles: `
    ion-segment {
      --background: var(--ion-color-light);
      border-radius: 12px;
    }
    ion-segment-button {
      --color: var(--ion-color-medium-shade);
      --color-checked: var(--ion-color-primary);
      --indicator-color: var(--ion-color-secondary);
      text-transform: none;
      font-weight: 600;
    }
    .gap {
      margin-top: 8px;
    }
    ion-item {
      --border-color: var(--ion-color-light-shade);
    }
    ion-item h2 {
      font-weight: 500;
    }
    ion-item p {
      font-size: 0.8rem;
      color: var(--ion-color-medium-shade);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--ion-color-secondary);
    }
    .unread {
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    .note {
      display: block;
      font-size: 0.75em;
    }
  `,
})
export class NotificationsPage {
  protected readonly strings = STRINGS;
  protected readonly text = FAC_STRINGS.notifications;
  protected readonly ui = UI_STRINGS;
  protected readonly store = inject(MockStore);
  protected readonly filter = signal<Filter>('all');
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly home = computed(() => (this.auth.role() ? homePath(this.auth.role()!) : '/'));

  protected readonly items = computed(() =>
    this.store
      .notifications()
      .filter((n) => this.filter() === 'all' || !n.read)
      .map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read,
        when: `${dateLabel(localDate(n.createdAt))} ${timeOfDay(n.createdAt)}`,
      })),
  );

  protected async open(id: string, link: string): Promise<void> {
    this.store.markRead(id);
    await this.router.navigateByUrl(link);
  }
}
