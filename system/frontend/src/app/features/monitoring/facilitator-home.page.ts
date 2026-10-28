// Facilitator overview: summary tiles and the list of assigned OJTs with progress (FR-MON-02).
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBadge, IonButton, IonContent, IonItem, IonLabel, IonList, IonNote, IonSearchbar, IonSelect, IonSelectOption } from '@ionic/angular';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { STRINGS } from '../../shared/strings';
import { FAC_STRINGS } from '../../shared/strings-fac';
import { UI_STRINGS } from '../../shared/strings-ui';
import { ProgressRingComponent } from '../../shared/ui/progress-ring.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { dateLabel, timeOfDay } from '../../shared/utils/format';
import { weekStart } from '../../shared/utils/hours';

type SortKey = 'name' | 'progress';

const WEEK_MINUTES = 40 * 60;
const DAY_MS = 86_400_000;

@Component({
  selector: 'app-facilitator-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent, IonContent, IonBadge, IonButton, IonList, IonItem, IonLabel, IonNote, IonSearchbar, IonSelect, IonSelectOption,
    RouterLink, ProgressRingComponent, StatTileComponent, StatusBadgeComponent,
  ],
  template: `
    <app-page-header [title]="strings.pages.facOverview" />
    <ion-content>
      <div class="ion-padding">
        <h2>{{ text.summary }}</h2>
        <div class="tiles">
          <app-stat-tile [label]="text.assigned" [value]="rows().length" />
          <app-stat-tile [label]="text.reportsToReview" [value]="store.pendingReports().length" color="warning" />
          <app-stat-tile [label]="text.correctionsToReview" [value]="store.pendingCorrections().length" color="warning" />
          <app-stat-tile [label]="text.behind" [value]="behindCount()" color="danger" />
        </div>
        <ion-button expand="block" routerLink="/facilitator/reviews">{{ text.openReviews }}</ion-button>
        <h2>{{ text.list }}</h2>
        <ion-searchbar [placeholder]="text.search" [value]="query()" (ionInput)="query.set($any($event).detail.value ?? '')" />
        <ion-select [label]="text.sortLabel" [value]="sort()" interface="popover" (ionChange)="sort.set($any($event).detail.value)">
          <ion-select-option value="name">{{ text.sortName }}</ion-select-option>
          <ion-select-option value="progress">{{ text.sortProgress }}</ion-select-option>
        </ion-select>
      </div>
      @if (visible().length === 0) {
        <p class="ion-padding">{{ text.empty }}</p>
      }
      <ion-list>
        @for (row of visible(); track row.id) {
          <ion-item [routerLink]="['/facilitator/overview', row.id]" detail>
            <div slot="start" class="ring">
              <app-progress-ring [value]="row.percent" [size]="56" [label]="text.ring(row.name)" />
            </div>
            <ion-label>
              <h2>
                {{ row.name }}
                @if (row.behind) {
                  <ion-badge color="danger">{{ text.behindBadge }}</ion-badge>
                }
              </h2>
              <p>{{ row.company }}</p>
              <p>{{ row.hours }}</p>
              <p>{{ text.lastTimeIn(row.lastIn) }}</p>
              <p class="badges">
                <span>{{ text.thisWeek }}: <app-status-badge [status]="row.thisWeek" /></span>
                <span>{{ text.lastWeek }}: <app-status-badge [status]="row.lastWeek" /></span>
              </p>
            </ion-label>
          </ion-item>
        }
      </ion-list>
      <ion-note class="ion-padding ion-text-center note">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }
    .ring {
      width: 56px;
    }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .note {
      display: block;
      font-size: 0.75em;
    }
  `,
})
export class FacilitatorHomePage {
  protected readonly strings = STRINGS;
  protected readonly text = FAC_STRINGS.home;
  protected readonly ui = UI_STRINGS;
  protected readonly store = inject(MockStore);
  protected readonly query = signal('');
  protected readonly sort = signal<SortKey>('name');

  protected readonly rows = computed(() => {
    const thisStart = weekStart(new Date());
    const lastStart = new Date(Date.parse(`${thisStart}T00:00:00Z`) - 7 * DAY_MS).toISOString().slice(0, 10);
    return this.store.assignedOjts().map((o) => {
      const p = this.store.progress(o.id);
      const done = this.store.reportsOf(o.id).filter((r) => r.status === 'submitted' || r.status === 'approved').length;
      const elapsedWeeks = Math.max(0, this.store.weeksOf(o.id).length - 1);
      const expected = o.requiredHours ? ((elapsedWeeks * WEEK_MINUTES) / (o.requiredHours * 60)) * 100 : 0;
      return {
        id: o.id,
        name: o.fullName,
        company: o.companyName,
        percent: p.percent,
        hours: UI_STRINGS.hoursOf(p.approvedMinutes, p.requiredMinutes),
        lastIn: o.lastTimeIn ? `${dateLabel(o.lastTimeIn.slice(0, 10))} ${timeOfDay(o.lastTimeIn)}` : FAC_STRINGS.common.noTimeIn,
        thisWeek: this.store.report(o.id, thisStart)?.status ?? 'none',
        lastWeek: this.store.report(o.id, lastStart)?.status ?? 'none',
        behind: done < elapsedWeeks || p.loggedPercent < 0.9 * expected,
      };
    });
  });

  protected readonly behindCount = computed(() => this.rows().filter((r) => r.behind).length);

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.rows().filter((r) => r.name.toLowerCase().includes(q));
    return this.sort() === 'name' ? list.sort((a, b) => a.name.localeCompare(b.name)) : list.sort((a, b) => b.percent - a.percent);
  });
}
