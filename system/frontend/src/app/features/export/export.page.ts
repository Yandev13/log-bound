// OJT DTR export: choose a date range, see the hours for each day, and export (FR-EXP-01).
// Prototype: the PDF file comes in a later stage. The page builds a text summary now.
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AlertController, IonButton, IonChip, IonContent, IonInput, IonLabel, IonNote, ToastController } from '@ionic/angular';
import { addDays } from '../../data/mock/mock-data';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { OJT_STRINGS } from '../../shared/strings-ojt';
import { UI_STRINGS } from '../../shared/strings-ui';
import { dateLabel } from '../../shared/utils/format';
import { localDate, weekStart } from '../../shared/utils/hours';

type Chip = 'week' | 'lastWeek' | 'month' | 'all';

@Component({
  selector: 'app-export-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonInput, IonChip, IonLabel, IonButton, IonNote],
  template: `
    <app-page-header [title]="text.title" backHref="/ojt/home" />
    <ion-content class="ion-padding">
      <h3>{{ text.range }}</h3>
      <div class="chips">
        @for (chip of chips; track chip.key) {
          <ion-chip outline (click)="choose(chip.key)">
            <ion-label>{{ chip.label }}</ion-label>
          </ion-chip>
        }
      </div>

      <div class="dates">
        <ion-input
          type="date"
          fill="outline"
          labelPlacement="stacked"
          [label]="text.from"
          [value]="from()"
          [max]="today"
          (ionInput)="from.set(valueOf($event))"
        />
        <ion-input
          type="date"
          fill="outline"
          labelPlacement="stacked"
          [label]="text.to"
          [value]="to()"
          [max]="today"
          (ionInput)="to.set(valueOf($event))"
        />
      </div>
      @if (!rangeValid()) {
        <p class="error">{{ text.invalidRange }}</p>
      }

      <h3>{{ text.preview }}</h3>
      @if (rangeValid() && rows().length === 0) {
        <p class="empty">{{ text.empty }}</p>
      }
      @if (rows().length > 0) {
        <table>
          <thead>
            <tr>
              <th>{{ text.day }}</th>
              <th class="num">{{ text.hours }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.date) {
              <tr>
                <td>{{ dateLabel(row.date) }}</td>
                <td class="num">{{ ui.hours(row.minutes) }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="total">
          <strong>{{ text.total(ui.hours(totalMinutes())) }}</strong>
          <span> - {{ text.days(rows().length) }}</span>
        </p>
      }

      <ion-button expand="block" [disabled]="!canExport()" (click)="confirmExport()">{{ text.exportPdf }}</ion-button>
      <ion-button expand="block" fill="outline" disabled="true">{{ text.share }}</ion-button>
      <ion-note class="block">{{ text.shareNote }}</ion-note>

      @if (summary()) {
        <pre class="summary">{{ summary() }}</pre>
      }

      <ion-note class="proto">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
  styles: `
    h3 {
      margin: 16px 0 6px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
    }
    .dates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }
    .error {
      color: var(--ion-color-danger);
    }
    .empty {
      color: var(--ion-color-medium-shade);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 6px 4px;
      text-align: left;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .total {
      text-align: right;
    }
    ion-button {
      margin-top: 12px;
    }
    .block {
      display: block;
      margin-top: 4px;
    }
    .summary {
      background: var(--ion-color-light);
      padding: 8px;
      border-radius: 8px;
      white-space: pre-wrap;
      font-size: 0.8em;
    }
    .proto {
      display: block;
      margin-top: 16px;
      font-size: 0.75em;
    }
  `,
})
export class ExportPage {
  protected readonly text = OJT_STRINGS.export;
  protected readonly ui = UI_STRINGS;
  protected readonly dateLabel = dateLabel;
  protected readonly today = localDate(new Date());
  protected readonly chips: { key: Chip; label: string }[] = [
    { key: 'week', label: this.text.chipWeek },
    { key: 'lastWeek', label: this.text.chipLastWeek },
    { key: 'month', label: this.text.chipMonth },
    { key: 'all', label: this.text.chipAll },
  ];

  protected readonly from = signal(`${this.today.slice(0, 8)}01`);
  protected readonly to = signal(this.today);
  protected readonly summary = signal('');

  private readonly store = inject(MockStore);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  protected readonly rangeValid = computed(() => !!this.from() && !!this.to() && this.from() <= this.to());

  protected readonly rows = computed(() => {
    if (!this.rangeValid()) {
      return [];
    }
    return Object.entries(this.store.me().dailyMinutes)
      .filter(([date, minutes]) => minutes > 0 && date >= this.from() && date <= this.to())
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  protected readonly totalMinutes = computed(() => this.rows().reduce((sum, r) => sum + r.minutes, 0));
  protected readonly canExport = computed(() => this.rangeValid() && this.rows().length > 0);

  protected valueOf(event: Event): string {
    return String((event as CustomEvent).detail.value ?? '');
  }

  protected choose(chip: Chip): void {
    const monday = weekStart(new Date());
    const ranges: Record<Chip, [string, string]> = {
      week: [monday, this.today],
      lastWeek: [addDays(monday, -7), addDays(monday, -1)],
      month: [`${this.today.slice(0, 8)}01`, this.today],
      all: [this.store.me().startDate, this.today],
    };
    const [from, to] = ranges[chip];
    this.from.set(from);
    this.to.set(to);
  }

  protected async confirmExport(): Promise<void> {
    const alert = await this.alerts.create({
      header: this.text.exportPdf,
      message: this.text.confirmMessage(this.from(), this.to()),
      buttons: [
        { text: this.text.cancel, role: 'cancel' },
        { text: this.text.exportPdf, role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'confirm') {
      await this.exportSummary();
    }
  }

  private async exportSummary(): Promise<void> {
    const lines = [
      this.text.summaryTitle,
      `${this.store.me().fullName}, ${this.store.me().companyName}`,
      `${this.from()} - ${this.to()}`,
      ...this.rows().map((r) => `${r.date},${UI_STRINGS.hours(r.minutes)}`),
      this.text.total(UI_STRINGS.hours(this.totalMinutes())),
    ];
    this.summary.set(lines.join('\n'));
    const toast = await this.toasts.create({ message: this.text.exportLater, duration: 3000, color: 'medium' });
    await toast.present();
  }
}
