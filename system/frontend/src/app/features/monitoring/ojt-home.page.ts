// OJT home: hours progress, hours of this week, report status, and quick actions (FR-MON-01).
// Data comes from the prototype store (sample data).
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular';
import { ME, addDays } from '../../data/mock/mock-data';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { STRINGS } from '../../shared/strings';
import { OJT_STRINGS } from '../../shared/strings-ojt';
import { UI_STRINGS } from '../../shared/strings-ui';
import { BarChartComponent, BarItem } from '../../shared/ui/bar-chart.component';
import { ProgressRingComponent } from '../../shared/ui/progress-ring.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { weekStart } from '../../shared/utils/hours';

@Component({
  selector: 'app-ojt-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
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
    <app-page-header [title]="strings.pages.ojtHome" />
    <ion-content class="ion-padding">
      <h2>{{ text.greeting(store.me().fullName) }}</h2>
      <p class="company">{{ store.me().companyName }}</p>

      <app-progress-ring
        [value]="progress().percent"
        [secondary]="progress().loggedPercent"
        [size]="190"
        color="success"
        secondaryColor="primary"
        [caption]="ui.hoursOf(progress().approvedMinutes, progress().requiredMinutes)"
      />

      <div class="tiles">
        <app-stat-tile [label]="text.logged" [value]="ui.hours(progress().loggedMinutes)" color="primary" />
        <app-stat-tile [label]="text.approved" [value]="ui.hours(progress().approvedMinutes)" color="success" />
        <app-stat-tile [label]="text.remaining" [value]="ui.hours(progress().remainingMinutes)" color="medium" />
      </div>

      <ion-card>
        <ion-card-content>
          <h3>{{ text.thisWeek }}</h3>
          <app-bar-chart [items]="bars()" [target]="8" [targetText]="text.target" [height]="150" [label]="text.thisWeek" />
          <p class="total">{{ text.weekTotal(ui.hours(weekTotal())) }}</p>
        </ion-card-content>
      </ion-card>

      @for (row of reportRows(); track row.week) {
        <ion-card>
          <ion-card-content class="status-row">
            <div>
              <h3>{{ row.title }}</h3>
              <app-status-badge [status]="row.status" />
            </div>
            <ion-button size="small" fill="outline" [routerLink]="['/ojt/reports', row.week]">{{ text.open }}</ion-button>
          </ion-card-content>
        </ion-card>
      }

      <h3>{{ text.quick }}</h3>
      <ion-list>
        @for (action of actions; track action.link) {
          <ion-item [routerLink]="action.link" detail>
            <ion-label>{{ action.label }}</ion-label>
          </ion-item>
        }
      </ion-list>

      <ion-note class="proto">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
    styles: `
    h2 {
      margin: 8px 0 0;
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    .company {
      margin-top: 0;
      color: var(--ion-color-medium-shade);
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 16px 0;
    }
    .total {
      text-align: right;
      margin: 8px 0 0;
      font-weight: 600;
      color: var(--ion-color-primary);
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    h3 {
      margin: 0 0 6px;
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    ion-list {
      background: transparent;
      padding: 0;
    }
    ion-item {
      --background: var(--ion-color-light);
      --border-radius: 12px;
      --border-width: 0;
      margin-bottom: 8px;
      border-radius: 12px;
      font-weight: 600;
    }
    .proto {
      display: block;
      margin-top: 16px;
      font-size: 0.75em;
    }
  `,
})
export class OjtHomePage {
  protected readonly strings = STRINGS;
  protected readonly text = OJT_STRINGS.home;
  protected readonly ui = UI_STRINGS;
  protected readonly store = inject(MockStore);

  protected readonly actions = [
    { label: this.text.quickDtr, link: '/ojt/dtr' },
    { label: this.text.quickCorrections, link: '/ojt/corrections' },
    { label: this.text.quickExport, link: '/ojt/export' },
    { label: this.text.quickProgress, link: '/ojt/progress' },
  ];

  protected readonly progress = computed(() => this.store.progress(ME));
  private readonly thisWeek = weekStart(new Date());
  private readonly days = computed(() => this.store.weekDays(ME, this.thisWeek));
  protected readonly weekTotal = computed(() => this.days().reduce((sum, d) => sum + d.minutes, 0));
  protected readonly bars = computed<BarItem[]>(() =>
    this.days().map((d, i) => ({
      label: UI_STRINGS.weekdayShort[i],
      value: d.minutes / 60,
      valueText: d.minutes ? String(Math.round(d.minutes / 6) / 10) : '',
      color: 'primary',
    })),
  );

  protected readonly reportRows = computed(() => {
    const lastWeek = addDays(this.thisWeek, -7);
    return [
      { week: this.thisWeek, title: this.text.reportThisWeek, status: this.store.report(ME, this.thisWeek)?.status ?? 'none' },
      { week: lastWeek, title: this.text.reportLastWeek, status: this.store.report(ME, lastWeek)?.status ?? 'none' },
    ];
  });
}
