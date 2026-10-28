// OJT correction request form: add a missed punch or change the time of a punch (FR-COR-01).
// The reason is necessary and has at least 10 characters.
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonButton, IonContent, IonInput, IonLabel, IonNote, IonSegment, IonSegmentButton, IonTextarea, ToastController } from '@ionic/angular';
import { CorrectionKind } from '../../data/mock/mock-data';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { OJT_STRINGS } from '../../shared/strings-ojt';
import { UI_STRINGS } from '../../shared/strings-ui';
import { localDate } from '../../shared/utils/hours';

const MIN_REASON = 10;
const MAX_REASON = 500;

@Component({
  selector: 'app-correction-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonSegment, IonSegmentButton, IonLabel, IonInput, IonTextarea, IonButton, IonNote],
  template: `
    <app-page-header [title]="text.newTitle" backHref="/ojt/corrections" />
    <ion-content class="ion-padding">
      <p class="label">{{ text.kind }}</p>
      <ion-segment [value]="kind()" (ionChange)="setKind($event)">
        <ion-segment-button value="add">
          <ion-label>{{ list.kindAdd }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="change">
          <ion-label>{{ list.kindChange }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      <p class="label">{{ text.punchType }}</p>
      <ion-segment [value]="punchType()" (ionChange)="setPunch($event)">
        <ion-segment-button value="in">
          <ion-label>{{ list.punchIn }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="out">
          <ion-label>{{ list.punchOut }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      <ion-input
        class="field"
        type="date"
        fill="outline"
        labelPlacement="stacked"
        [label]="text.date"
        [max]="today"
        [value]="date()"
        [errorText]="dateError()"
        [class.ion-invalid]="touched() && !!dateError()"
        [class.ion-touched]="touched()"
        (ionInput)="date.set(valueOf($event)); touched.set(true)"
      />

      @if (kind() === 'change') {
        <ion-input
          class="field"
          type="time"
          fill="outline"
          labelPlacement="stacked"
          [label]="text.originalTime"
          [value]="original()"
          [errorText]="text.originalRequired"
          [class.ion-invalid]="touched() && !original()"
          [class.ion-touched]="touched()"
          (ionInput)="original.set(valueOf($event)); touched.set(true)"
        />
      }

      <ion-input
        class="field"
        type="time"
        fill="outline"
        labelPlacement="stacked"
        [label]="text.requestedTime"
        [value]="requested()"
        [errorText]="text.requestedRequired"
        [class.ion-invalid]="touched() && !requested()"
        [class.ion-touched]="touched()"
        (ionInput)="requested.set(valueOf($event)); touched.set(true)"
      />

      <ion-textarea
        class="field"
        fill="outline"
        labelPlacement="stacked"
        [label]="text.reason"
        [rows]="3"
        [autoGrow]="true"
        [counter]="true"
        [maxlength]="maxReason"
        [value]="reason()"
        [errorText]="text.reasonMin(minReason)"
        [class.ion-invalid]="touched() && !reasonValid()"
        [class.ion-touched]="touched()"
        (ionInput)="reason.set(valueOf($event)); touched.set(true)"
      />

      <ion-button expand="block" [disabled]="!formValid() || busy()" (click)="confirm()">{{ text.submit }}</ion-button>
      <ion-note class="proto">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
  styles: `
    .label {
      margin: 16px 0 6px;
      font-weight: 600;
    }
    .field {
      margin-top: 16px;
    }
    ion-button {
      margin-top: 24px;
    }
    .proto {
      display: block;
      margin-top: 16px;
      font-size: 0.75em;
    }
  `,
})
export class CorrectionFormPage {
  protected readonly text = OJT_STRINGS.correctionForm;
  protected readonly list = OJT_STRINGS.corrections;
  protected readonly ui = UI_STRINGS;
  protected readonly minReason = MIN_REASON;
  protected readonly maxReason = MAX_REASON;
  protected readonly today = localDate(new Date());

  protected readonly kind = signal<CorrectionKind>('add');
  protected readonly punchType = signal<'in' | 'out'>('in');
  protected readonly date = signal('');
  protected readonly original = signal('');
  protected readonly requested = signal('');
  protected readonly reason = signal('');
  protected readonly touched = signal(false);
  protected readonly busy = signal(false);

  private readonly store = inject(MockStore);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  protected readonly dateError = computed(() => {
    const date = this.date();
    if (!date) {
      return this.text.dateRequired;
    }
    return date > this.today ? this.text.failure['future-date'] : '';
  });
  protected readonly reasonValid = computed(() => this.reason().trim().length >= MIN_REASON);
  protected readonly formValid = computed(
    () =>
      !this.dateError() &&
      !!this.requested() &&
      (this.kind() === 'add' || !!this.original()) &&
      this.reasonValid(),
  );

  protected valueOf(event: Event): string {
    return String((event as CustomEvent).detail.value ?? '');
  }

  protected setKind(event: Event): void {
    this.kind.set(this.valueOf(event) as CorrectionKind);
  }

  protected setPunch(event: Event): void {
    this.punchType.set(this.valueOf(event) as 'in' | 'out');
  }

  protected async confirm(): Promise<void> {
    const alert = await this.alerts.create({
      header: this.text.confirmHeader,
      message: this.text.confirmMessage,
      buttons: [
        { text: this.text.cancel, role: 'cancel' },
        { text: this.text.confirm, role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'confirm') {
      await this.send();
    }
  }

  private async send(): Promise<void> {
    this.busy.set(true);
    const change = this.kind() === 'change';
    const result = this.store.addCorrection({
      kind: this.kind(),
      punchType: this.punchType(),
      date: this.date(),
      originalTime: change ? this.original() : undefined,
      requestedTime: this.requested(),
      reason: this.reason(),
    });
    this.busy.set(false);
    if (!result.ok) {
      await this.toast(this.text.failure[result.reason ?? 'reason-required'], 'danger');
      return;
    }
    await this.toast(this.text.sent, 'success');
    await this.router.navigateByUrl('/ojt/corrections');
  }

  private async toast(message: string, color: string): Promise<void> {
    const toast = await this.toasts.create({ message, duration: 2500, color });
    await toast.present();
  }
}
