// Facilitator: the DTR of one assigned OJT, read-only, with the doubtful-time flag (FR-DTR-10, FR-DTR-11).
// It reads the local data, so it works offline (cached).
import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { IonContent, IonNote, IonRefresher, IonRefresherContent } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { AssignedOjt, AssignmentRepository } from '../../data/repositories/assignment.repository';
import { SyncService } from '../../data/sync/sync.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { STRINGS } from '../../shared/strings';
import { HistoryWeek } from './dtr-history';
import { DtrHistoryComponent } from './dtr-history.component';
import { DtrService } from './dtr.service';

@Component({
  selector: 'app-ojt-dtr-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonRefresher, IonRefresherContent, IonNote, DtrHistoryComponent],
  template: `
    <app-page-header [title]="ojt()?.fullName || strings.pages.ojtDtr" backHref="/facilitator/ojts" />
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>
      @if (ojt(); as o) {
        <p>{{ o.companyName }}</p>
        <ion-note class="note">{{ text.doubtfulNote }}</ion-note>
        <app-dtr-history [weeks]="weeks()" [showDoubtful]="true" />
      } @else if (loaded()) {
        <p>{{ text.notAssigned }}</p>
      }
    </ion-content>
  `,
    styles: `
    p {
      margin: 0 0 8px;
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    .note {
      display: block;
      margin-bottom: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      color: var(--ion-color-dark);
      background: rgba(var(--ion-color-warning-rgb), 0.2);
    }
  `,
})
export class OjtDtrPage {
  /** From the route parameter (withComponentInputBinding). */
  readonly ojtId = input.required<string>();

  protected readonly strings = STRINGS;
  protected readonly text = STRINGS.facilitator;
  protected readonly ojt = signal<AssignedOjt | null>(null);
  protected readonly weeks = signal<HistoryWeek[]>([]);
  protected readonly loaded = signal(false);

  private readonly auth = inject(AuthService);
  private readonly assignments = inject(AssignmentRepository);
  private readonly dtr = inject(DtrService);
  private readonly sync = inject(SyncService);

  constructor() {
    effect(() => {
      this.sync.revision();
      const ojtId = this.ojtId();
      untracked(() => void this.load(ojtId));
    });
  }

  async refresh(event: CustomEvent): Promise<void> {
    try {
      await this.sync.trigger();
      await this.load(this.ojtId());
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  private async load(ojtId: string): Promise<void> {
    const me = this.auth.profile()?.id;
    // Show only an OJT of this facilitator. The local data has no other OJT, but the URL can have any ID.
    const ojt = me ? await this.assignments.ojtOf(me, ojtId) : null;
    this.ojt.set(ojt);
    this.weeks.set(ojt ? await this.dtr.history(ojtId) : []);
    this.loaded.set(true);
  }
}
