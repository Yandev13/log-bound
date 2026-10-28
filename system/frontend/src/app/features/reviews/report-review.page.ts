// Facilitator: review one weekly report; approve or return it with a remark (FR-RPT-02, FR-RPT-05, FR-RPT-07, FR-RPT-08).
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonButton, IonContent, IonModal, IonNote, IonTextarea, ToastController } from '@ionic/angular';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { FAC_STRINGS } from '../../shared/strings-fac';
import { UI_STRINGS } from '../../shared/strings-ui';
import { BarChartComponent, BarItem } from '../../shared/ui/bar-chart.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { dateLabel, timeOfDay } from '../../shared/utils/format';

type Decision = 'approved' | 'returned';

@Component({
  selector: 'app-report-review-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonButton, IonNote, IonTextarea, IonModal, StatusBadgeComponent, BarChartComponent],
  template: `
    <app-page-header [title]="text.week" backHref="/facilitator/reviews" />
    <ion-content>
      @if (report(); as r) {
        <div class="ion-padding">
          <h2>{{ ojtName() }}</h2>
          <p>{{ common.weekOf(weekRange()) }} <app-status-badge [status]="r.status" /></p>
          <p>{{ text.logged }}: {{ ui.hours(totalMinutes()) }}</p>
          <h3>{{ text.dayHours }}</h3>
          <app-bar-chart [items]="bars()" [target]="8" [targetText]="text.target" [label]="text.dayHours" />
          @for (s of sections(); track s.title) {
            <h3>{{ s.title }}</h3>
            <p class="body">{{ s.body || text.noText }}</p>
          }
          <h3>{{ text.photos }}</h3>
          @if (r.photos.length === 0) {
            <p>{{ text.noPhotos }}</p>
          }
          <div class="photos">
            @for (p of r.photos; track $index) {
              <button type="button" class="photo" (click)="photo.set(p)">
                <img [src]="p" [alt]="text.photoLabel($index + 1)" />
              </button>
            }
          </div>
          <h3>{{ text.history }}</h3>
          <ul class="history">
            @for (h of history(); track $index) {
              <li>
                <span>{{ h.when }}</span>
                <app-status-badge [status]="h.status" />
                <span>{{ h.by }}</span>
                @if (h.remark) {
                  <em>{{ h.remark }}</em>
                }
              </li>
            }
          </ul>
          @if (r.status === 'submitted') {
            <h3>{{ text.decision }}</h3>
            <ion-textarea
              [label]="common.remark"
              labelPlacement="floating"
              fill="outline"
              [autoGrow]="true"
              [value]="remark()"
              (ionInput)="remark.set($any($event).detail.value ?? '')"
            />
            @if (!hasRemark()) {
              <ion-note>{{ text.remarkHelp }}</ion-note>
            }
            <div class="actions">
              <ion-button color="success" [disabled]="busy()" (click)="decide('approved')">{{ text.approve }}</ion-button>
              <ion-button color="danger" [disabled]="busy() || !hasRemark()" (click)="decide('returned')">{{ text.return }}</ion-button>
            </div>
          } @else {
            <ion-note>{{ text.readOnly }}</ion-note>
          }
        </div>
      } @else {
        <p class="ion-padding">{{ common.notFound }}</p>
      }
      <ion-note class="ion-padding ion-text-center note">{{ ui.prototypeNote }}</ion-note>
      <ion-modal [isOpen]="photo() !== null" (didDismiss)="photo.set(null)">
        <ng-template>
          <ion-content>
            <img class="big" [src]="photo()" [alt]="text.photos" />
            <ion-button expand="block" (click)="photo.set(null)">{{ text.closePhoto }}</ion-button>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: `
    .body {
      white-space: pre-wrap;
    }
    .photos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    .photo {
      padding: 0;
      border: 0;
      background: none;
    }
    .photo img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 6px;
    }
    .big {
      width: 100%;
      object-fit: contain;
    }
    .history {
      list-style: none;
      padding: 0;
    }
    .history li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .note {
      display: block;
      font-size: 0.75em;
    }
  `,
})
export class ReportReviewPage {
  readonly id = input.required<string>();

  protected readonly text = FAC_STRINGS.report;
  protected readonly common = FAC_STRINGS.common;
  protected readonly ui = UI_STRINGS;
  protected readonly remark = signal('');
  protected readonly busy = signal(false);
  protected readonly photo = signal<string | null>(null);
  private readonly store = inject(MockStore);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly router = inject(Router);

  protected readonly report = computed(() => this.store.reportById(this.id()));
  protected readonly ojtName = computed(() => this.store.ojt(this.report()?.ojtId ?? '')?.fullName ?? '');
  protected readonly hasRemark = computed(() => this.remark().trim().length > 0);

  protected readonly weekRange = computed(() => dateLabel(this.report()?.weekStart ?? ''));

  private readonly days = computed(() => {
    const r = this.report();
    return r ? this.store.weekDays(r.ojtId, r.weekStart) : [];
  });
  protected readonly totalMinutes = computed(() => this.days().reduce((sum, d) => sum + d.minutes, 0));
  protected readonly bars = computed<BarItem[]>(() =>
    this.days().map((d, i) => {
      const hours = Math.round((d.minutes / 60) * 10) / 10;
      return { label: UI_STRINGS.weekdayShort[i], value: hours, valueText: String(hours) };
    }),
  );

  protected readonly sections = computed(() => {
    const r = this.report();
    const t = FAC_STRINGS.report.sections;
    return r
      ? [
          { title: t.tasksDone, body: r.tasksDone },
          { title: t.skillsLearned, body: r.skillsLearned },
          { title: t.problems, body: r.problems },
          { title: t.plansNextWeek, body: r.plansNextWeek },
        ]
      : [];
  });

  protected readonly history = computed(() =>
    (this.report()?.history ?? []).map((h) => ({
      when: `${dateLabel(h.at.slice(0, 10))} ${timeOfDay(h.at)}`,
      status: h.status,
      by: h.by,
      remark: h.remark,
    })),
  );

  protected async decide(decision: Decision): Promise<void> {
    const approve = decision === 'approved';
    const alert = await this.alerts.create({
      header: approve ? this.text.approveHeader : this.text.returnHeader,
      message: approve ? this.text.approveMessage : this.text.returnMessage,
      buttons: [
        { text: this.common.cancel, role: 'cancel' },
        { text: this.common.confirm, role: 'confirm' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'confirm') {
      return;
    }
    this.busy.set(true);
    const result = this.store.reviewReport(this.id(), decision, this.remark());
    this.busy.set(false);
    const message = !result.ok ? this.text.failed : approve ? this.text.approved : this.text.returned;
    const toast = await this.toasts.create({ message, duration: 2500, color: result.ok ? 'success' : 'danger' });
    await toast.present();
    if (result.ok) {
      await this.router.navigateByUrl('/facilitator/reviews');
    }
  }
}
