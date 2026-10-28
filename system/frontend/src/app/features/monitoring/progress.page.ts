// OJT progress: hours, expected last day, and hours for each week with the report status (FR-MON-01).
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonContent, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular';
import { ME } from '../../data/mock/mock-data';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { STRINGS } from '../../shared/strings';
import { OJT_STRINGS } from '../../shared/strings-ojt';
import { UI_STRINGS } from '../../shared/strings-ui';
import { BarChartComponent, BarItem } from '../../shared/ui/bar-chart.component';
import { ProgressRingComponent } from '../../shared/ui/progress-ring.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { dateLabel } from '../../shared/utils/format';

const STATUS_COLOR: Record<string, string> = { approved: 'success', submitted: 'warning', returned: 'danger' };

@Component({
  selector: 'app-progress-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    RouterLink,
    ProgressRingComponent,
    StatTileComponent,
    BarChartComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header [title]="strings.pages.ojtProgress" />
    <ion-content class="ion-padding">
      <app-progress-ring
        [value]="progress().percent"
        [secondary]="progress().loggedPercent"
        [size]="190"
        color="success"
        secondaryColor="primary"
        [caption]="ui.hoursOf(progress().approvedMinutes, progress().requiredMinutes)"
      />
      <div class="tiles">
        <app-stat-tile [label]="home.logged" [value]="ui.hours(progress().loggedMinutes)" color="primary" />
        <app-stat-tile [label]="home.approved" [value]="ui.hours(progress().approvedMinutes)" color="success" />
        <app-stat-tile [label]="home.remaining" [value]="ui.hours(progress().remainingMinutes)" color="medium" />
      </div>
      <p class="end">
        <strong>{{ text.projectedEnd }}:</strong>
        {{ endText() }}
      </p>

      <ion-card>
        <ion-card-content>
          <h3>{{ text.weeks }}</h3>
          @if (bars().length === 0) {
            <p>{{ text.noWeeks }}</p>
          } @else {
            <app-bar-chart [items]="bars()" [selected]="selected()" [height]="170" [label]="text.weeks" (barSelect)="select($event)" />
            <ul class="legend" [attr.aria-label]="text.legend">
              <li><span class="dot success"></span>{{ text.legendApproved }}</li>
              <li><span class="dot warning"></span>{{ text.legendSubmitted }}</li>
              <li><span class="dot danger"></span>{{ text.legendReturned }}</li>
              <li><span class="dot medium"></span>{{ text.legendOther }}</li>
            </ul>
          }
        </ion-card-content>
      </ion-card>

      @if (selectedWeek(); as week) {
        <ion-card>
          <ion-card-content>
            <h3>{{ text.selectedWeek(dateLabel(week)) }}</h3>
            <app-bar-chart [items]="dayBars()" [target]="8" [targetText]="home.target" [height]="120" [label]="text.selectedWeek(week)" />
          </ion-card-content>
        </ion-card>
      }

      <h3>{{ text.weekList }}</h3>
      <ion-list>
        @for (row of rows(); track row.week) {
          <ion-item [routerLink]="['/ojt/reports', row.week]" detail>
            <ion-label>
              <h2>{{ text.selectedWeek(dateLabel(row.week)) }}</h2>
              <p>{{ ui.hours(row.minutes) }}</p>
            </ion-label>
            <app-status-badge slot="end" [status]="row.status" />
          </ion-item>
        }
      </ion-list>

      <ion-note class="proto">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
    styles: `
    .tiles {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 16px 0;
    }
    .end {
      text-align: center;
      padding: 10px;
      border-radius: 12px;
      background: var(--ion-color-light);
    }
    .end strong {
      color: var(--ion-color-primary);
    }
    h3 {
      margin: 0 0 6px;
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      list-style: none;
      padding: 0;
      margin: 10px 0 0;
      font-size: 0.75em;
      color: var(--ion-color-medium-shade);
    }
    .dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 4px;
    }
    .dot.success {
      background: var(--ion-color-success);
    }
    .dot.warning {
      background: var(--ion-color-warning);
    }
    .dot.danger {
      background: var(--ion-color-danger);
    }
    .dot.medium {
      background: var(--ion-color-medium);
    }
    ion-list {
      background: transparent;
      padding: 0;
    }
    ion-item {
      --background: var(--ion-color-light);
      --border-width: 0;
      margin-bottom: 8px;
      border-radius: 12px;
    }
    ion-item h2 {
      font-weight: 600;
    }
    ion-item p {
      color: var(--ion-color-medium-shade);
    }
    .proto {
      display: block;
      margin-top: 16px;
      font-size: 0.75em;
    }
  `,
})
export class ProgressPage {
  protected readonly strings = STRINGS;
  protected readonly text = OJT_STRINGS.progress;
  protected readonly home = OJT_STRINGS.home;
  protected readonly ui = UI_STRINGS;
  protected readonly dateLabel = dateLabel;
  protected readonly selected = signal<number | null>(null);

  private readonly store = inject(MockStore);

  protected readonly progress = computed(() => this.store.progress(ME));
  protected readonly endText = computed(() => {
    const end = this.progress().projectedEnd;
    return end ? dateLabel(end) : this.text.noProjection;
  });

  /** Newest first, for the list. */
  protected readonly rows = computed(() =>
    this.store.weeksOf(ME).map((week) => ({
      week,
      minutes: this.store.weekMinutes(ME, week),
      status: this.store.report(ME, week)?.status ?? 'none',
    })),
  );

  /** Oldest first, for the chart. */
  private readonly chartRows = computed(() => [...this.rows()].reverse());

  protected readonly bars = computed<BarItem[]>(() =>
    this.chartRows().map((r) => ({
      label: r.week.slice(5),
      value: r.minutes / 60,
      valueText: String(Math.round(r.minutes / 6) / 10),
      color: STATUS_COLOR[r.status] ?? 'medium',
    })),
  );

  protected readonly selectedWeek = computed(() => {
    const i = this.selected();
    return i === null ? null : (this.chartRows()[i]?.week ?? null);
  });

  protected readonly dayBars = computed<BarItem[]>(() => {
    const week = this.selectedWeek();
    return week
      ? this.store.weekDays(ME, week).map((d, i) => ({
          label: UI_STRINGS.weekdayShort[i],
          value: d.minutes / 60,
          valueText: d.minutes ? String(Math.round(d.minutes / 6) / 10) : '',
        }))
      : [];
  });

  protected select(index: number): void {
    this.selected.set(index);
  }
}
