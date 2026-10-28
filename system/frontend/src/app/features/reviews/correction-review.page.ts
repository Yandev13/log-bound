// Facilitator: review one correction request; approve or reject it with a remark (FR-COR-02, FR-COR-03).
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonButton, IonContent, IonNote, IonTextarea, ToastController } from '@ionic/angular';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { FAC_STRINGS } from '../../shared/strings-fac';
import { UI_STRINGS } from '../../shared/strings-ui';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { dateLabel, timeOfDay } from '../../shared/utils/format';

type Decision = 'approved' | 'rejected';

@Component({
  selector: 'app-correction-review-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonButton, IonNote, IonTextarea, StatusBadgeComponent],
  template: `
    <app-page-header [title]="text.kind" backHref="/facilitator/reviews" />
    <ion-content>
      @if (request(); as c) {
        <div class="ion-padding">
          <h2>{{ ojtName() }} <app-status-badge [status]="c.status" /></h2>
          <p>{{ text.kind }}: {{ common.kind[c.kind] }}</p>
          <p>{{ text.punch }}: {{ common.punchType[c.punchType] }}</p>
          <p>{{ text.date }}: {{ date(c.date) }}</p>
          <div class="compare">
            <div class="box">
              <span class="cap">{{ text.original }}</span>
              <strong>{{ c.originalTime ?? reviews.none }}</strong>
            </div>
            <div class="box">
              <span class="cap">{{ text.requested }}</span>
              <strong>{{ c.requestedTime }}</strong>
            </div>
          </div>
          <h3>{{ text.reason }}</h3>
          <p class="body">{{ c.reason }}</p>
          <p>{{ text.created(when(c.createdAt)) }}</p>
          <ion-note>{{ text.note }}</ion-note>
          @if (c.status === 'pending') {
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
              <ion-button color="danger" [disabled]="busy() || !hasRemark()" (click)="decide('rejected')">{{ text.reject }}</ion-button>
            </div>
          } @else {
            <h3>{{ text.decidedRemark }}</h3>
            <p>{{ c.remark ?? text.noRemark }}</p>
            @if (c.decidedAt) {
              <p>{{ text.decidedAt(when(c.decidedAt)) }}</p>
            }
          }
        </div>
      } @else {
        <p class="ion-padding">{{ common.notFound }}</p>
      }
      <ion-note class="ion-padding ion-text-center note">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
  styles: `
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0;
    }
    .box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      background: var(--ion-color-light, #f4f5f8);
    }
    .cap {
      font-size: 0.75em;
      color: var(--ion-color-medium-shade);
    }
    .body {
      white-space: pre-wrap;
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
export class CorrectionReviewPage {
  readonly id = input.required<string>();

  protected readonly text = FAC_STRINGS.correction;
  protected readonly common = FAC_STRINGS.common;
  protected readonly reviews = FAC_STRINGS.reviews;
  protected readonly ui = UI_STRINGS;
  protected readonly date = dateLabel;
  protected readonly remark = signal('');
  protected readonly busy = signal(false);
  private readonly store = inject(MockStore);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly router = inject(Router);

  protected readonly request = computed(() => this.store.correction(this.id()));
  protected readonly ojtName = computed(() => this.store.ojt(this.request()?.ojtId ?? '')?.fullName ?? '');
  protected readonly hasRemark = computed(() => this.remark().trim().length > 0);

  protected when(iso: string): string {
    return `${dateLabel(iso.slice(0, 10))} ${timeOfDay(iso)}`;
  }

  protected async decide(decision: Decision): Promise<void> {
    const approve = decision === 'approved';
    const alert = await this.alerts.create({
      header: approve ? this.text.approveHeader : this.text.rejectHeader,
      message: approve ? this.text.approveMessage : this.text.rejectMessage,
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
    const result = this.store.decideCorrection(this.id(), decision, this.remark());
    this.busy.set(false);
    const message = !result.ok ? this.text.failed : approve ? this.text.approved : this.text.rejected;
    const toast = await this.toasts.create({ message, duration: 2500, color: result.ok ? 'success' : 'danger' });
    await toast.present();
    if (result.ok) {
      await this.router.navigateByUrl('/facilitator/reviews');
    }
  }
}
