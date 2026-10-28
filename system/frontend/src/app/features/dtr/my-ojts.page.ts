// Facilitator: the assigned OJTs with the hours of this week and the marks to examine (FR-DTR-10, FR-DTR-11).
// It reads the local data, so it works offline (cached). Pull down to sync (FR-SYNC-03).
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBadge, IonContent, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { AssignedOjt, AssignmentRepository } from '../../data/repositories/assignment.repository';
import { SyncService } from '../../data/sync/sync.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { STRINGS } from '../../shared/strings';
import { duration } from '../../shared/utils/format';
import { DtrSummary } from './dtr-history';
import { DtrService } from './dtr.service';

interface OjtRow extends AssignedOjt {
  summary: DtrSummary;
}

@Component({
  selector: 'app-my-ojts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonRefresher, IonRefresherContent, IonList, IonItem, IonLabel, IonBadge, RouterLink],
  template: `
    <app-page-header [title]="strings.pages.facOjts" />
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>
      @if (rows().length === 0) {
        <p class="ion-padding">{{ text.noOjts }}</p>
      }
      <ion-list>
        @for (row of rows(); track row.ojtId) {
          <ion-item [routerLink]="['/facilitator/ojts', row.ojtId]" detail>
            <ion-label>
              <h2>{{ row.fullName }}</h2>
              <p>{{ row.companyName }}</p>
              <p>{{ text.thisWeek(duration(row.summary.weekMinutes)) }}</p>
              <p class="flags">
                @if (row.summary.doubtfulPunches > 0) {
                  <ion-badge color="tertiary">{{ text.doubtful(row.summary.doubtfulPunches) }}</ion-badge>
                }
                @if (row.summary.missingTimeOuts > 0) {
                  <ion-badge color="danger">{{ text.missing(row.summary.missingTimeOuts) }}</ion-badge>
                }
              </p>
            </ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  styles: `
    .flags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  `,
})
export class MyOjtsPage {
  protected readonly strings = STRINGS;
  protected readonly text = STRINGS.facilitator;
  protected readonly duration = duration;
  protected readonly rows = signal<OjtRow[]>([]);

  private readonly auth = inject(AuthService);
  private readonly assignments = inject(AssignmentRepository);
  private readonly dtr = inject(DtrService);
  private readonly sync = inject(SyncService);

  constructor() {
    effect(() => {
      this.sync.revision();
      untracked(() => void this.load());
    });
  }

  async refresh(event: CustomEvent): Promise<void> {
    try {
      await this.sync.trigger();
      await this.load();
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  private async load(): Promise<void> {
    const id = this.auth.profile()?.id;
    if (!id) {
      return;
    }
    const ojts = await this.assignments.ojtsOf(id);
    const now = new Date();
    this.rows.set(await Promise.all(ojts.map(async (o) => ({ ...o, summary: await this.dtr.summary(o.ojtId, now) }))));
  }
}
