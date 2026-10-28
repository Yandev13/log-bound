// Facilitator: the progress overview of one OJT (FR-MON-02, FR-DTR-10).
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { FAC_STRINGS } from '../../shared/strings-fac';
import { UI_STRINGS } from '../../shared/strings-ui';
import { BarChartComponent, BarItem } from '../../shared/ui/bar-chart.component';
import { ProgressRingComponent } from '../../shared/ui/progress-ring.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { dateLabel } from '../../shared/utils/format';

const STATUS_COLOR: Record<string, string> = { approved: 'success', submitted: 'warning', returned: 'danger' };

@Component({
  selector: 'app-ojt-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent, IonContent, IonButton, IonList, IonItem, IonLabel, IonNote, RouterLink,
    ProgressRingComponent, StatTileComponent, StatusBadgeComponent, BarChartComponent,
  ],
  template: `
    <app-page-header [title]="ojt()?.fullName ?? ''" backHref="/facilitator/overview" />
    <ion-content>
      @if (ojt(); as o) {
        <div class="ion-padding">
          <h2>{{ o.fullName }}</h2>
          <p>{{ o.email }}</p>
          <p>{{ text.contact(o.contactNumber) }}</p>
          <p>{{ text.company(o.companyName) }}</p>
          <p>{{ text.batch(o.batchName) }}</p>
          <p>{{ text.start(date(o.startDate)) }}</p>
          <ion-button expand="block" [routerLink]="['/facilitator/ojts', o.id]">{{ text.openDtr }}</ion-button>
        </div>
        @if (progress(); as p) {
          <app-progress-ring [value]="p.percent" [secondary]="p.loggedPercent" [size]="160" [caption]="text.approvedCaption" />
          <div class="tiles ion-padding">
            <app-stat-tile [label]="text.logged" [value]="ui.hours(p.loggedMinutes)" />
            <app-stat-tile [label]="text.approved" [value]="ui.hours(p.approvedMinutes)" color="success" />
            <app-stat-tile [label]="text.remaining" [value]="ui.hours(p.remainingMinutes)" color="medium" />
            <app-stat-tile [label]="text.projectedEnd" [value]="p.projectedEnd ? date(p.projectedEnd) : text.noProjection" color="warning" />
          </div>
        }
        <div class="ion-padding">
          <h3>{{ text.chartTitle }}</h3>
          <app-bar-chart [items]="bars()" [label]="text.chartTitle" />
          <ion-note>{{ text.legend }}</ion-note>
        </div>
        <h3 class="ion-padding-horizontal">{{ text.weeks }}</h3>
        @if (weeks().length === 0) {
          <p class="ion-padding">{{ text.noWeeks }}</p>
        }
        <ion-list>
          @for (w of weeks(); track w.week) {
            <ion-item [routerLink]="w.reportId ? ['/facilitator/reviews/report', w.reportId] : null" [detail]="!!w.reportId">
              <ion-label>
                <h3>{{ common.weekOf(date(w.week)) }}</h3>
                <p>{{ ui.hours(w.minutes) }}</p>
              </ion-label>
              <app-status-badge slot="end" [status]="w.status" />
            </ion-item>
          }
        </ion-list>
        <h3 class="ion-padding-horizontal">{{ text.corrections }}</h3>
        @if (corrections().length === 0) {
          <p class="ion-padding">{{ text.noCorrections }}</p>
        }
        <ion-list>
          @for (c of corrections(); track c.id) {
            <ion-item [routerLink]="['/facilitator/reviews/correction', c.id]" detail>
              <ion-label>
                <h3>{{ common.punchType[c.punchType] }}, {{ date(c.date) }}</h3>
                <p>{{ common.kind[c.kind] }}</p>
              </ion-label>
              <app-status-badge slot="end" [status]="c.status" />
            </ion-item>
          }
        </ion-list>
      } @else {
        <p class="ion-padding">{{ common.notFound }}</p>
      }
      <ion-note class="ion-padding ion-text-center note">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .note {
      display: block;
      font-size: 0.75em;
    }
  `,
})
export class OjtOverviewPage {
  readonly ojtId = input.required<string>();

  protected readonly text = FAC_STRINGS.overview;
  protected readonly common = FAC_STRINGS.common;
  protected readonly ui = UI_STRINGS;
  protected readonly date = dateLabel;
  private readonly store = inject(MockStore);

  protected readonly ojt = computed(() => this.store.ojt(this.ojtId()));
  protected readonly progress = computed(() => (this.ojt() ? this.store.progress(this.ojtId()) : null));

  /** The weeks, newest first, with the hours and the report status. */
  protected readonly weeks = computed(() =>
    this.store.weeksOf(this.ojtId()).map((week) => {
      const report = this.store.report(this.ojtId(), week);
      return { week, minutes: this.store.weekMinutes(this.ojtId(), week), status: report?.status ?? 'none', reportId: report?.id ?? null };
    }),
  );

  protected readonly bars = computed<BarItem[]>(() =>
    [...this.weeks()]
      .reverse()
      .map((w) => ({
        label: w.week.slice(5),
        value: Math.round((w.minutes / 60) * 10) / 10,
        valueText: String(Math.round((w.minutes / 60) * 10) / 10),
        color: STATUS_COLOR[w.status] ?? 'medium',
      })),
  );

  protected readonly corrections = computed(() => this.store.correctionsOf(this.ojtId()));
}
