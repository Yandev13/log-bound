// OJT weekly reports: one row for each week, with a filter by status (FR-RPT-01 to FR-RPT-06).
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonItem, IonLabel, IonList, IonNote, IonSegment, IonSegmentButton } from '@ionic/angular';
import { ME, addDays } from '../../data/mock/mock-data';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { STRINGS } from '../../shared/strings';
import { OJT_STRINGS } from '../../shared/strings-ojt';
import { UI_STRINGS } from '../../shared/strings-ui';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { dateLabel } from '../../shared/utils/format';

type Filter = 'all' | 'todo' | 'submitted' | 'approved';

interface Row {
  week: string;
  end: string;
  minutes: number;
  status: string;
  remark: string | null;
}

/** The status groups of the filter. A week without a report belongs to "To do". */
function matches(filter: Filter, status: string): boolean {
  switch (filter) {
    case 'todo':
      return status === 'draft' || status === 'returned' || status === 'none';
    case 'submitted':
      return status === 'submitted';
    case 'approved':
      return status === 'approved';
    default:
      return true;
  }
}

@Component({
  selector: 'app-reports-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonSegment, IonSegmentButton, IonList, IonItem, IonLabel, IonNote, RouterLink, StatusBadgeComponent, StatTileComponent],
  template: `
    <app-page-header [title]="strings.pages.ojtReports" />
    <ion-content class="ion-padding">
      <div class="tiles">
        <app-stat-tile [label]="text.filterTodo" [value]="counts().todo" color="medium" />
        <app-stat-tile [label]="text.filterSubmitted" [value]="counts().submitted" color="warning" />
        <app-stat-tile [label]="text.filterApproved" [value]="counts().approved" color="success" />
      </div>

      <ion-segment [value]="filter()" (ionChange)="setFilter($event)">
        <ion-segment-button value="all">
          <ion-label>{{ text.filterAll }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="todo">
          <ion-label>{{ text.filterTodo }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="submitted">
          <ion-label>{{ text.filterSubmitted }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="approved">
          <ion-label>{{ text.filterApproved }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (visible().length === 0) {
        <p class="empty">{{ text.empty }}</p>
      }
      <ion-list>
        @for (row of visible(); track row.week) {
          <ion-item [routerLink]="['/ojt/reports', row.week]" detail>
            <ion-label class="ion-text-wrap">
              <h2>{{ text.weekOf(dateLabel(row.week)) }}</h2>
              <p>{{ dateLabel(row.week) }} - {{ dateLabel(row.end) }}</p>
              <p>{{ ui.hours(row.minutes) }}</p>
              @if (row.remark) {
                <p class="remark">{{ text.returnedRemark(row.remark) }}</p>
              }
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
      margin-bottom: 16px;
    }
    ion-segment {
      --background: var(--ion-color-light);
      margin-bottom: 8px;
      border-radius: 12px;
    }
    ion-segment-button {
      --color: var(--ion-color-medium-shade);
      --color-checked: var(--ion-color-primary);
      --indicator-color: var(--ion-color-secondary);
      text-transform: none;
      font-weight: 600;
    }
    .empty {
      text-align: center;
      color: var(--ion-color-medium-shade);
    }
    ion-list {
      background: transparent;
      padding: 0;
    }
    ion-item {
      --background: var(--ion-color-light);
      --border-width: 0;
      --border-radius: 12px;
      margin-top: 8px;
      border-radius: 12px;
    }
    ion-item h2 {
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    ion-item p {
      color: var(--ion-color-medium-shade);
    }
    .remark {
      color: var(--ion-color-danger);
    }
    .proto {
      display: block;
      margin-top: 16px;
      font-size: 0.75em;
    }
  `,
})
export class ReportsPage {
  protected readonly strings = STRINGS;
  protected readonly text = OJT_STRINGS.reports;
  protected readonly ui = UI_STRINGS;
  protected readonly dateLabel = dateLabel;
  protected readonly filter = signal<Filter>('all');

  private readonly store = inject(MockStore);

  private readonly rows = computed<Row[]>(() =>
    this.store.weeksOf(ME).map((week) => {
      const report = this.store.report(ME, week);
      const status = report?.status ?? 'none';
      const last = report?.history[report.history.length - 1];
      return {
        week,
        end: addDays(week, 6),
        minutes: this.store.weekMinutes(ME, week),
        status,
        remark: status === 'returned' ? (last?.remark ?? null) : null,
      };
    }),
  );

  protected readonly visible = computed(() => this.rows().filter((r) => matches(this.filter(), r.status)));

  protected readonly counts = computed(() => {
    const all = this.rows();
    const count = (f: Filter) => all.filter((r) => matches(f, r.status)).length;
    return { todo: count('todo'), submitted: count('submitted'), approved: count('approved') };
  });

  protected setFilter(event: CustomEvent): void {
    this.filter.set(event.detail.value as Filter);
  }
}
