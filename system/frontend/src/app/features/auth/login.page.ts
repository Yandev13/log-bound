// Login page (FR-AUTH-01, FR-AUTH-03). Form errors show at the field (QR-IC-04).
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonInput, IonNote, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { STRINGS } from '../../shared/strings';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-content>
      <div class="login">
        <div class="hero">
          <img src="../../../assets/log-bound-logo.png" />
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h1>Log in</h1>
          <ion-input
            formControlName="email"
            type="email"
            inputmode="email"
            autocomplete="username"
            [label]="s.login.email"
            labelPlacement="stacked"
            fill="outline"
            [errorText]="emailError()"
            data-testid="email"
          />
          <ion-input
            formControlName="password"
            type="password"
            autocomplete="current-password"
            [label]="s.login.password"
            labelPlacement="stacked"
            fill="outline"
            [errorText]="s.login.passwordRequired"
            data-testid="password"
          />
          @if (failure(); as text) {
            <ion-note color="danger" role="alert" data-testid="failure">{{ text }}</ion-note>
          }
          <ion-button type="submit" expand="block" [disabled]="busy()" data-testid="submit">
            @if (busy()) {
              <ion-spinner name="crescent" />
            } @else {
              {{ s.login.submit }}
            }
          </ion-button>
        </form>
      </div>
    </ion-content>
  `,
  styles: `
    .login {
      max-width: 420px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Blue top part with the logo and the title */
    .hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 48px 16px 40px;
      background: var(--ion-color-primary);
      border-bottom: 8px solid var(--ion-color-warning);
      border-radius: 0 0 50% 50% / 0 0 32px 32px;
    }
    .hero img {
      width: 75%;
    }
    .hero h1 {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--ion-color-primary-contrast);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 24px 24px;
    }
    ion-note {
      font-size: 0.85rem;
    }
    ion-button {
      min-height: 48px;
    }
  `,
})
export class LoginPage {
  protected readonly s = STRINGS;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly busy = signal(false);
  readonly failure = signal<string | null>(null);

  emailError(): string {
    return this.form.controls.email.hasError('required') ? this.s.login.emailRequired : this.s.login.emailInvalid;
  }

  async submit(): Promise<void> {
    this.failure.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const result = await this.auth.signIn(email, password);
      if (result.ok) {
        this.form.reset();
        await this.router.navigateByUrl(result.home, { replaceUrl: true });
      } else {
        this.failure.set(this.s.login.failure[result.reason]);
        this.form.controls.password.reset();
      }
    } finally {
      this.busy.set(false);
    }
  }
}