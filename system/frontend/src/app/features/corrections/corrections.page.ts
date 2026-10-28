// OJT correction requests: the list with the status of each request (FR-COR-01 to FR-COR-03).
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonContent, IonFab, IonFabButton, IonIcon, IonNote } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';
import { ME } from '../../data/mock/mock-data';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { OJT_STRINGS } from '../../shared/strings-ojt';
import { UI_STRINGS } from '../../shared/strings-ui';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { dateLabel, timeOfDay } from '../../shared/utils/format';
import { localDate } from '../../shared/utils/hours';

addIcons({ add });

@Component({
  selector: 'app-corrections-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonCard, IonCardContent, IonFab, IonFabButton, IonIcon, IonNote, RouterLink, StatusBadgeComponent],
  template: `
    <app-page-header [title]="text.title" backHref="/ojt/home" />
    <ion-content class="ion-padding">
      <ion-note class="block">{{ text.note }}</ion-note>

      @if (rows().length === 0) {
        <p class="empty">{{ text.empty }}</p>
      }
      @for (row of rows(); track row.id) {
        <ion-card>
          <ion-card-content>
            <div class="top">
              <strong>{{ row.kindText }}: {{ row.punchText }}</strong>
              <app-status-badge [status]="row.status" />
            </div>
            <p>{{ dateLabel(row.date) }}</p>
            <p>{{ row.timeText }}</p>
            <p>{{ text.reason(row.reason) }}</p>
            @if (row.remark) {
              <p>{{ text.remark(row.remark) }}</p>
            }
            @if (row.decided) {
              <p class="note">{{ text.decided(row.decided) }}</p>
            }
          </ion-card-content>
        </ion-card>
      }

      <ion-note class="proto">{{ ui.prototypeNote }}</ion-note>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button routerLink="/ojt/corrections/new" [attr.aria-label]="text.newRequest">
          <ion-icon name="add" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: `
    .block {
      display: block;
      margin-bottom: 12px;
    }
    .empty {
      text-align: center;
      color: var(--ion-color-medium-shade);
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    p {
      margin: 4px 0;
    }
    .note {
      color: var(--ion-color-medium-shade);
      font-size: 0.85em;
    }
    .proto {
      display: block;
      margin: 16px 0 72px;
      font-size: 0.75em;
    }
  `,
})
export class CorrectionsPage {
  protected readonly text = OJT_STRINGS.corrections;
  protected readonly ui = UI_STRINGS;
  protected readonly dateLabel = dateLabel;

  private readonly store = inject(MockStore);

  protected readonly rows = computed(() =>
    this.store.correctionsOf(ME).map((c) => ({
      id: c.id,
      date: c.date,
      status: c.status,
      reason: c.reason,
      remark: c.remark,
      kindText: c.kind === 'add' ? this.text.kindAdd : this.text.kindChange,
      punchText: c.punchType === 'in' ? this.text.punchIn : this.text.punchOut,
      timeText: c.originalTime ? this.text.change(c.originalTime, c.requestedTime) : this.text.add(c.requestedTime),
      decided: c.decidedAt ? `${dateLabel(localDate(c.decidedAt))}, ${timeOfDay(c.decidedAt)}` : null,
    })),
  );
}
