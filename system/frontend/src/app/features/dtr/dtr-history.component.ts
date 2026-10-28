// The DTR history list (FR-DTR-07): weeks, days, and sessions with the sync status of each punch.
// The doubtful-time flag is for the facilitator and the admin only (FR-DTR-11), so the OJT page hides it.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonBadge, IonItem, IonLabel, IonList, IonListHeader, IonNote } from '@ionic/angular';
import { Punch } from '../../data/repositories/punch.repository';
import { STRINGS } from '../../shared/strings';
import { dateLabel, duration, timeOfDay } from '../../shared/utils/format';
import { HistoryWeek } from './dtr-history';

const STATUS_COLOR = { pending: 'warning', synced: 'success', issue: 'danger' } as const;

@Component({
  selector: 'app-dtr-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonListHeader, IonItem, IonLabel, IonNote, IonBadge],
  template: `
    @if (weeks().length === 0) {
      <p>{{ text.noPunches }}</p>
    }
    @for (week of weeks(); track week.weekStart) {
      <ion-list>
        <ion-list-header>
          <ion-label>{{ text.weekOf(date(week.weekStart)) }}</ion-label>
          <ion-note>{{ text.total }}: {{ duration(week.minutes) }}</ion-note>
        </ion-list-header>
        @for (day of week.days; track day.date) {
          <ion-item lines="none" class="day">
            <ion-label>{{ date(day.date) }}</ion-label>
            <ion-note slot="end">{{ duration(day.minutes) }}</ion-note>
          </ion-item>
          @for (s of day.sessions; track s.timeIn.id) {
            <ion-item>
              <ion-label>
                <h3>{{ time(s.timeIn) }} – {{ s.timeOut ? time(s.timeOut) : text.open }}</h3>
                <p class="flags">
                  <ion-badge [color]="statusColor(s.timeIn)">{{ text.status[s.timeIn.syncStatus] }}</ion-badge>
                  @if (s.timeOut) {
                    <ion-badge [color]="statusColor(s.timeOut)">{{ text.status[s.timeOut.syncStatus] }}</ion-badge>
                  }
                  @if (s.missingTimeOut) {
                    <ion-badge color="danger">{{ text.missingTimeOut }}</ion-badge>
                  }
                  @if (showDoubtful() && (s.timeIn.doubtfulTime || s.timeOut?.doubtfulTime)) {
                    <ion-badge color="tertiary">{{ text.doubtfulTime }}</ion-badge>
                  }
                  @if (s.timeIn.lat === null) {
                    <ion-badge color="light">{{ text.noLocationFlag }}</ion-badge>
                  }
                </p>
              </ion-label>
              <ion-note slot="end">{{ s.timeOut ? duration(s.minutes) : '' }}</ion-note>
            </ion-item>
          }
        }
      </ion-list>
    }
  `,
  styles: `
    .day {
      font-weight: 600;
      --background: var(--ion-color-light);
    }
    .flags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }
  `,
})
export class DtrHistoryComponent {
  readonly weeks = input.required<HistoryWeek[]>();
  /** FR-DTR-11: true on the facilitator view only. */
  readonly showDoubtful = input(false);

  protected readonly text = STRINGS.dtr;
  protected readonly date = dateLabel;
  protected readonly duration = duration;

  protected time(p: Punch): string {
    return timeOfDay(p.deviceTime);
  }

  protected statusColor(p: Punch): string {
    return STATUS_COLOR[p.syncStatus];
  }
}
