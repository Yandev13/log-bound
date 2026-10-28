// "Sync issues" screen (FR-SYNC-06, TC-ST-OJT-03): each change that the server did not accept, the cause,
// and the user actions "Try again" and "Discard my change" (offline sync design, section 3).
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { AlertController, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { SyncIssue, SyncIssueRepository } from '../../data/repositories/sync-issue.repository';
import { SyncService } from '../../data/sync/sync.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { STRINGS } from '../../shared/strings';
import { issueCause, issueTime, issueTitle } from './sync-issue-text';

@Component({
  selector: 'app-sync-issues-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonButton],
  template: `
    <app-page-header [title]="strings.pages.syncIssues" [backHref]="home()" />
    <ion-content class="ion-padding">
      @if (issues().length === 0) {
        <p>{{ text.none }}</p>
      } @else {
        <p>{{ text.intro }}</p>
      }
      @for (issue of issues(); track issue.opId) {
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ title(issue) }}</ion-card-title>
            <ion-card-subtitle>{{ text.madeAt(madeAt(issue)) }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <p>{{ cause(issue) }}</p>
            <div class="actions">
              <ion-button size="small" [disabled]="busy()" (click)="retry(issue)">{{ text.retry }}</ion-button>
              <ion-button size="small" fill="outline" color="danger" [disabled]="busy()" (click)="discard(issue)">
                {{ text.discard }}
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: `
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
  `,
})
export class SyncIssuesPage {
  protected readonly strings = STRINGS;
  protected readonly text = STRINGS.issues;
  protected readonly issues = signal<SyncIssue[]>([]);
  protected readonly busy = signal(false);

  private readonly repo = inject(SyncIssueRepository);
  private readonly auth = inject(AuthService);
  private readonly sync = inject(SyncService);
  private readonly alerts = inject(AlertController);

  constructor() {
    effect(() => {
      this.sync.revision();
      untracked(() => void this.load());
    });
  }

  protected home(): string {
    return this.auth.profile()?.role === 'facilitator' ? '/facilitator' : '/ojt/dtr';
  }

  protected readonly title = issueTitle;
  protected readonly madeAt = issueTime;
  protected readonly cause = issueCause;

  async retry(issue: SyncIssue): Promise<void> {
    await this.act(() => this.repo.retry(issue));
  }

  async discard(issue: SyncIssue): Promise<void> {
    const alert = await this.alerts.create({
      message: this.text.discardConfirm,
      buttons: [
        { text: this.text.cancel, role: 'cancel' },
        { text: this.text.discard, role: 'destructive' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role === 'destructive') {
      await this.act(() => this.repo.discard(issue));
    }
  }

  private async act(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.sync.changed();
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    const id = this.auth.profile()?.id;
    this.issues.set(id ? await this.repo.list(id) : []);
  }
}
