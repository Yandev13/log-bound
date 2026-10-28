// Facilitator: the list of weekly reports and correction requests to review (FR-RPT-05, FR-COR-02).
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonItem, IonLabel, IonList, IonNote, IonSegment, IonSegmentButton } from '@ionic/angular';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { STRINGS } from '../../shared/strings';
import { FAC_STRINGS } from '../../shared/strings-fac';
import { UI_STRINGS } from '../../shared/strings-ui';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { dateLabel, timeOfDay } from '../../shared/utils/format';

type Kind = 'reports' | 'corrections';
type Filter = 'pending' | 'decided';

@Component({
  selector: 'app-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonList, IonItem, IonLabel, IonNote, IonSegment, IonSegmentButton, RouterLink, StatusBadgeComponent],
  template: `
    <app-page-header [title]="strings.pages.facReviews" />
    <ion-content>
      <div class="ion-padding">
        <ion-segment [value]="kind()" (ionChange)="kind.set($any($event).detail.value)">
          <ion-segment-button value="reports">
            <ion-label>{{ text.segmentReports(store.pendingReports().length) }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="corrections">
            <ion-label>{{ text.segmentCorrections(store.pendingCorrections().length) }}</ion-label>
          </ion-segment-button>
        </ion-segment>
        <ion-segment class="filter" [value]="filter()" (ionChange)="filter.set($any($event).detail.value)">
          <ion-segment-button value="pending">
            <ion-label>{{ text.pending }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="decided">
            <ion-label>{{ text.decided }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
      @if (kind() === 'reports') {
        @if (reports().length === 0) {
          <p class="ion-padding">{{ filter() === 'pending' ? text.empty : text.emptyDecided }}</p>
        }
        <ion-list>
          @for (r of reports(); track r.id) {
            <ion-item [routerLink]="['/facilitator/reviews/report', r.id]" detail>
              <ion-label>
                <h2>{{ r.name }}</h2>
                <p>{{ common.weekOf(r.week) }}</p>
                <p>{{ r.hours }}</p>
                <p>{{ text.submittedOn(r.submitted) }}</p>
              </ion-label>
              <app-status-badge slot="end" [status]="r.status" />
            </ion-item>
          }
        </ion-list>
      } @else {
        @if (corrections().length === 0) {
          <p class="ion-padding">{{ filter() === 'pending' ? text.empty : text.emptyDecided }}</p>
        }
        <ion-list>
          @for (c of corrections(); track c.id) {
            <ion-item [routerLink]="['/facilitator/reviews/correction', c.id]" detail>
              <ion-label>
                <h2>{{ c.name }}</h2>
                <p>{{ common.kind[c.kind] }}, {{ common.punchType[c.punchType] }}</p>
                <p>{{ c.date }}</p>
                <p>{{ text.requested(c.original, c.requestedTime) }}</p>
              </ion-label>
              <app-status-badge slot="end" [status]="c.status" />
            </ion-item>
          }
        </ion-list>
      }
      <ion-note class="ion-padding ion-text-center note">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
  styles: `
    .filter {
      margin-top: 8px;
    }
    .note {
      display: block;
      font-size: 0.75em;
    }
  `,
})
export class ReviewsPage {
  protected readonly strings = STRINGS;
  protected readonly text = FAC_STRINGS.reviews;
  protected readonly common = FAC_STRINGS.common;
  protected readonly ui = UI_STRINGS;
  protected readonly store = inject(MockStore);
  protected readonly kind = signal<Kind>('reports');
  protected readonly filter = signal<Filter>('pending');

  protected readonly reports = computed(() =>
    this.store
      .reports()
      .filter((r) => r.status !== 'draft' && (this.filter() === 'pending' ? r.status === 'submitted' : r.status !== 'submitted'))
      .map((r) => {
        const sent = r.history.find((h) => h.status === 'submitted');
        return {
          id: r.id,
          name: this.store.ojt(r.ojtId)?.fullName ?? '',
          week: dateLabel(r.weekStart),
          hours: UI_STRINGS.hours(this.store.weekMinutes(r.ojtId, r.weekStart)),
          submitted: sent ? `${dateLabel(sent.at.slice(0, 10))} ${timeOfDay(sent.at)}` : '',
          status: r.status,
          sortKey: sent?.at ?? r.updatedAt,
        };
      })
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey)),
  );

  protected readonly corrections = computed(() =>
    this.store
      .corrections()
      .filter((c) => (this.filter() === 'pending' ? c.status === 'pending' : c.status !== 'pending'))
      .map((c) => ({
        id: c.id,
        name: this.store.ojt(c.ojtId)?.fullName ?? '',
        kind: c.kind,
        punchType: c.punchType,
        date: dateLabel(c.date),
        original: c.originalTime ?? FAC_STRINGS.reviews.none,
        requestedTime: c.requestedTime,
        status: c.status,
        createdAt: c.createdAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
