// Profile for OJT and facilitator: assignment, contact number, password change (FR-PROF-01, FR-PROF-02, FR-AUTH-06).
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AlertController, IonButton, IonCheckbox, IonContent, IonInput, IonItem, IonLabel, IonList, IonNote, ToastController } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { homePath } from '../../core/auth/access';
import { MockStore } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { PlaceholderComponent } from '../../shared/placeholder/placeholder.component';
import { STRINGS } from '../../shared/strings';
import { FAC_STRINGS } from '../../shared/strings-fac';
import { UI_STRINGS } from '../../shared/strings-ui';
import { dateLabel } from '../../shared/utils/format';

const PH_MOBILE = /^(09|\+639)\d{9}$/;
const MIN_PASSWORD = 8;

@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, PlaceholderComponent, IonContent, IonButton, IonCheckbox, IonInput, IonItem, IonLabel, IonList, IonNote],
  template: `
    <app-page-header [title]="strings.pages.profile" [backHref]="home()" />
    <ion-content>
      <div class="ion-padding">
        <div class="who">
          <div class="avatar"><app-placeholder [label]="text.photo" /></div>
          <div>
            <h2>{{ auth.profile()?.fullName }}</h2>
            <p>{{ roleText() }}</p>
          </div>
        </div>
        @if (isOjt()) {
          <h3>{{ text.assignment }}</h3>
          <ion-list lines="none">
            <ion-item><ion-label><p>{{ text.company }}</p><h3>{{ me().companyName }}</h3></ion-label></ion-item>
            <ion-item><ion-label><p>{{ text.facilitator }}</p><h3>{{ me().facilitatorName }}</h3></ion-label></ion-item>
            <ion-item><ion-label><p>{{ text.batch }}</p><h3>{{ me().batchName }}</h3></ion-label></ion-item>
            <ion-item><ion-label><p>{{ text.requiredHours }}</p><h3>{{ me().requiredHours }}</h3></ion-label></ion-item>
            <ion-item><ion-label><p>{{ text.startDate }}</p><h3>{{ date(me().startDate) }}</h3></ion-label></ion-item>
            <ion-item><ion-label><p>{{ text.email }}</p><h3>{{ me().email }}</h3></ion-label></ion-item>
          </ion-list>
          <h3>{{ text.contact }}</h3>
          <ion-input
            [label]="text.contact"
            labelPlacement="floating"
            fill="outline"
            type="tel"
            [value]="contact()"
            [helperText]="text.contactHint"
            [errorText]="text.contactInvalid"
            [class.ion-invalid]="!contactValid()"
            [class.ion-touched]="true"
            (ionInput)="contact.set($any($event).detail.value ?? '')"
          />
          <ion-button [disabled]="!contactValid() || !contactChanged()" (click)="saveContact()">{{ text.save }}</ion-button>
        } @else {
          <p>{{ text.assignedOjts(store.assignedOjts().length) }}</p>
        }

        <h3>{{ text.password }}</h3>
        <ion-input [label]="text.current" labelPlacement="floating" fill="outline" [type]="type()" autocomplete="current-password"
          [value]="current()" (ionInput)="current.set($any($event).detail.value ?? '')" />
        <ion-input class="gap" [label]="text.next" labelPlacement="floating" fill="outline" [type]="type()" autocomplete="new-password"
          [value]="next()" (ionInput)="next.set($any($event).detail.value ?? '')" />
        <ion-input class="gap" [label]="text.confirmPassword" labelPlacement="floating" fill="outline" [type]="type()" autocomplete="new-password"
          [value]="confirm()" (ionInput)="confirm.set($any($event).detail.value ?? '')" />
        <ion-checkbox [checked]="show()" (ionChange)="show.set($any($event).detail.checked)">{{ text.show }}</ion-checkbox>
        @if (passwordProblem(); as problem) {
          <p><ion-note color="danger">{{ problem }}</ion-note></p>
        }
        @if (passwordFailure(); as failure) {
          <p><ion-note color="danger">{{ failure }}</ion-note></p>
        }
        <ion-button [disabled]="passwordProblem() !== null || busy()" (click)="changePassword()">{{ text.change }}</ion-button>

        <h3>{{ text.data }}</h3>
        <ion-button color="medium" fill="outline" (click)="reset()">{{ text.reset }}</ion-button>
        <p><ion-note>{{ text.version }}</ion-note></p>
      </div>
      <ion-note class="ion-padding ion-text-center note">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
    styles: `
    .who {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .who h2 {
      margin: 0;
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    .who p {
      margin: 4px 0 0;
      color: var(--ion-color-medium-shade);
    }
    .avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid var(--ion-color-primary);
    }
    h3 {
      margin: 20px 0 8px;
      font-weight: 700;
      color: var(--ion-color-primary);
    }
    ion-list {
      background: transparent;
      padding: 0;
    }
    ion-item {
      --background: var(--ion-color-light);
      --border-width: 0;
      margin-bottom: 6px;
      border-radius: 12px;
    }
    ion-item p {
      font-size: 0.8rem;
      color: var(--ion-color-medium-shade);
    }
    ion-item h3 {
      margin: 2px 0 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--ion-color-dark);
    }
    ion-checkbox {
      margin-top: 12px;
      --checkbox-background-checked: var(--ion-color-primary);
      --border-color-checked: var(--ion-color-primary);
    }
    ion-button {
      margin-top: 12px;
    }
    .gap {
      margin-top: 8px;
    }
    .note {
      display: block;
      font-size: 0.75em;
    }
  `,
})
export class ProfilePage {
  protected readonly strings = STRINGS;
  protected readonly text = FAC_STRINGS.profile;
  protected readonly ui = UI_STRINGS;
  protected readonly date = dateLabel;
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(MockStore);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  protected readonly me = this.store.me;
  protected readonly isOjt = computed(() => this.auth.role() === 'ojt');
  protected readonly home = computed(() => (this.auth.role() ? homePath(this.auth.role()!) : '/'));
  protected readonly roleText = computed(() => {
    const role = this.auth.role();
    return role ? this.text.role[role] : '';
  });

  protected readonly contact = signal(this.store.me().contactNumber);
  private readonly cleanContact = computed(() => this.contact().replace(/\s/g, ''));
  protected readonly contactValid = computed(() => PH_MOBILE.test(this.cleanContact()));
  protected readonly contactChanged = computed(() => this.cleanContact() !== this.store.me().contactNumber);

  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly confirm = signal('');
  protected readonly show = signal(false);
  protected readonly type = computed(() => (this.show() ? 'text' : 'password'));
  protected readonly busy = signal(false);
  protected readonly passwordFailure = signal<string | null>(null);

  /** The first problem of the password form, or null when the form is valid. */
  protected readonly passwordProblem = computed(() => {
    const t = this.text;
    if (!this.current()) {
      return t.currentRequired;
    }
    if (this.next().length < MIN_PASSWORD) {
      return t.tooShort;
    }
    if (this.next() === this.current()) {
      return t.same;
    }
    return this.next() === this.confirm() ? null : t.mismatch;
  });

  protected async saveContact(): Promise<void> {
    this.store.updateContact(this.cleanContact());
    await this.toast(this.text.contactSaved, 'success');
  }

  protected async changePassword(): Promise<void> {
    this.busy.set(true);
    this.passwordFailure.set(null);
    try {
      const result = await this.auth.changePassword(this.current(), this.next());
      if (result.ok) {
        this.current.set('');
        this.next.set('');
        this.confirm.set('');
        await this.toast(this.text.changed, 'success');
      } else {
        this.passwordFailure.set(this.text.failure[result.reason]);
      }
    } catch {
      this.passwordFailure.set(this.text.failure.unknown);
    } finally {
      this.busy.set(false);
    }
  }

  protected async reset(): Promise<void> {
    const alert = await this.alerts.create({
      header: this.text.resetHeader,
      message: this.text.resetMessage,
      buttons: [
        { text: FAC_STRINGS.common.cancel, role: 'cancel' },
        { text: FAC_STRINGS.common.confirm, role: 'confirm' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'confirm') {
      return;
    }
    this.store.reset();
    this.contact.set(this.store.me().contactNumber);
    await this.toast(this.text.resetDone, 'success');
  }

  private async toast(message: string, color: string): Promise<void> {
    const toast = await this.toasts.create({ message, duration: 2500, color });
    await toast.present();
  }
}
