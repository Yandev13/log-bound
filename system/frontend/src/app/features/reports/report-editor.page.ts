// OJT weekly report editor: four text fields, up to five photos, save draft, submit, and the status
// history (FR-RPT-01 to FR-RPT-08, FR-EXP-02). The hours of the week come from the DTR (FR-RPT-02).
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonButton, IonCard, IonCardContent, IonContent, IonIcon, IonItem, IonLabel, IonList, IonNote, IonTextarea, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeCircle, imageOutline } from 'ionicons/icons';
import { ME, addDays } from '../../data/mock/mock-data';
import { MAX_REPORT_PHOTOS, MockStore, ReportContent } from '../../data/mock/mock-store.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { OJT_STRINGS } from '../../shared/strings-ojt';
import { UI_STRINGS } from '../../shared/strings-ui';
import { BarChartComponent, BarItem } from '../../shared/ui/bar-chart.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { dateLabel, timeOfDay } from '../../shared/utils/format';
import { localDate } from '../../shared/utils/hours';

addIcons({ closeCircle, imageOutline });

const MAX_LENGTH = 2000;
const MAX_PHOTO_WIDTH = 800;
const PHOTO_QUALITY = 0.7;

type TextKey = 'tasksDone' | 'skillsLearned' | 'problems' | 'plansNextWeek';

/** Reads an image file and gives a small JPEG data URL (maximum 800 px wide). */
function toSmallDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('bad image'));
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_WIDTH / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('no canvas'));
          return;
        }
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

@Component({
  selector: 'app-report-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IonContent, IonCard, IonCardContent, IonTextarea, IonButton, IonIcon, IonList, IonItem, IonLabel, IonNote, BarChartComponent, StatusBadgeComponent],
  template: `
    <app-page-header [title]="text.weekOfTitle(weekText())" backHref="/ojt/reports" />
    <ion-content class="ion-padding">
      @if (!valid()) {
        <p>{{ text.notFound }}</p>
      } @else {
        @if (report().status === 'returned') {
          <ion-card color="danger">
            <ion-card-content>
              <strong>{{ text.returnedTitle }}</strong>
              <p>{{ lastRemark() }}</p>
            </ion-card-content>
          </ion-card>
        }

        <div class="head">
          <div>
            <h2>{{ rangeText() }}</h2>
            <p class="hours">{{ text.weekLogged }}: {{ ui.hours(minutes()) }}</p>
          </div>
          <app-status-badge [status]="report().status" />
        </div>
        <app-bar-chart [items]="bars()" [target]="8" [targetText]="'8 h'" [height]="110" [label]="text.weekLogged" />

        @if (!editable()) {
          <ion-note class="block">{{ text.readOnly(statusText()) }}</ion-note>
        }

        @for (f of fields; track f.key) {
          <ion-textarea
            [label]="f.label"
            labelPlacement="floating"
            fill="outline"
            [rows]="4"
            [autoGrow]="true"
            [counter]="true"
            [maxlength]="maxLength"
            [readonly]="!editable()"
            [helperText]="f.required ? text.required : ''"
            [value]="form()[f.key]"
            (ionInput)="setText(f.key, $event)"
          />
        }

        <h3>{{ text.photos }}</h3>
        <p class="hours">{{ text.photoCount(form().photos.length, maxPhotos) }}</p>
        <div class="photos">
          @for (photo of form().photos; track $index) {
            <div class="photo">
              <img [src]="photo" alt="" />
              @if (editable()) {
                <ion-button class="remove" fill="clear" size="small" color="danger" [attr.aria-label]="text.removePhoto" (click)="removePhoto($index)">
                  <ion-icon slot="icon-only" name="close-circle" />
                </ion-button>
              }
            </div>
          }
        </div>
        @if (editable()) {
          <input #file type="file" accept="image/*" hidden (change)="addPhotos($event)" />
          <ion-button fill="outline" [disabled]="form().photos.length >= maxPhotos" (click)="file.click()">
            <ion-icon slot="start" name="image-outline" />
            {{ text.addPhoto }}
          </ion-button>
          @if (form().photos.length >= maxPhotos) {
            <ion-note class="block">{{ text.photoMax }}</ion-note>
          }
        }

        @if (editable()) {
          @if (dirty()) {
            <p class="unsaved">{{ text.unsaved }}</p>
          }
          <div class="actions">
            <ion-button expand="block" fill="outline" [disabled]="!dirty()" (click)="save()">{{ text.saveDraft }}</ion-button>
            <ion-button expand="block" [disabled]="!canSubmit()" (click)="confirmSubmit()">{{ text.submit }}</ion-button>
          </div>
        }
        @if (report().status === 'approved') {
          <ion-button expand="block" color="success" (click)="exportPdf()">{{ text.exportPdf }}</ion-button>
        }

        <h3>{{ text.history }}</h3>
        @if (history().length === 0) {
          <ion-note>{{ text.noHistory }}</ion-note>
        }
        <ion-list lines="full">
          @for (entry of history(); track entry.at) {
            <ion-item>
              <ion-label class="ion-text-wrap">
                <h3>{{ dateLabel(entry.date) }}, {{ entry.time }}</h3>
                <p>{{ text.historyBy(entry.by) }}</p>
                @if (entry.remark) {
                  <p>{{ entry.remark }}</p>
                }
              </ion-label>
              <app-status-badge slot="end" [status]="entry.status" />
            </ion-item>
          }
        </ion-list>
      }
      <ion-note class="proto">{{ ui.prototypeNote }}</ion-note>
    </ion-content>
  `,
  styles: `
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    h2 {
      margin: 0;
      font-size: 1.1em;
    }
    h3 {
      margin: 16px 0 6px;
    }
    .hours {
      margin: 4px 0;
      color: var(--ion-color-medium-shade);
    }
    .block {
      display: block;
      margin: 8px 0;
    }
    ion-textarea {
      margin-top: 16px;
    }
    .photos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .photo {
      position: relative;
    }
    .photo img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 8px;
    }
    .remove {
      position: absolute;
      top: -6px;
      right: -6px;
      margin: 0;
    }
    .unsaved {
      color: var(--ion-color-warning-shade);
      margin-bottom: 0;
    }
    .actions {
      display: grid;
      gap: 4px;
      margin: 8px 0;
    }
    .proto {
      display: block;
      margin-top: 16px;
      font-size: 0.75em;
    }
  `,
})
export class ReportEditorPage {
  /** The Monday of the week (route parameter). */
  readonly week = input.required<string>();

  protected readonly text = OJT_STRINGS.editor;
  protected readonly ui = UI_STRINGS;
  protected readonly maxLength = MAX_LENGTH;
  protected readonly maxPhotos = MAX_REPORT_PHOTOS;
  protected readonly dateLabel = dateLabel;
  protected readonly fields: { key: TextKey; label: string; required: boolean }[] = [
    { key: 'tasksDone', label: this.text.tasksDone, required: true },
    { key: 'skillsLearned', label: this.text.skillsLearned, required: true },
    { key: 'problems', label: this.text.problems, required: false },
    { key: 'plansNextWeek', label: this.text.plans, required: false },
  ];

  private readonly store = inject(MockStore);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  protected readonly form = signal<ReportContent>({ tasksDone: '', skillsLearned: '', problems: '', plansNextWeek: '', photos: [] });

  protected readonly valid = computed(() => this.store.weeksOf(ME).includes(this.week()));
  protected readonly report = computed(() => this.store.reportOrDraft(ME, this.week()));
  protected readonly editable = computed(() => this.store.canEdit(this.report()));
  protected readonly minutes = computed(() => this.store.weekMinutes(ME, this.week()));
  protected readonly weekText = computed(() => dateLabel(this.week()));
  protected readonly rangeText = computed(() => `${dateLabel(this.week())} - ${dateLabel(addDays(this.week(), 6))}`);
  protected readonly statusText = computed(() => this.ui.status[this.report().status].toLowerCase());

  protected readonly bars = computed<BarItem[]>(() =>
    this.store.weekDays(ME, this.week()).map((d, i) => ({
      label: UI_STRINGS.weekdayShort[i],
      value: d.minutes / 60,
      valueText: d.minutes ? String(Math.round(d.minutes / 6) / 10) : '',
    })),
  );

  protected readonly lastRemark = computed(() => {
    const history = this.report().history;
    return history[history.length - 1]?.remark ?? this.text.noRemark;
  });

  protected readonly history = computed(() =>
    [...this.report().history].reverse().map((h) => ({ ...h, date: localDate(h.at), time: timeOfDay(h.at) })),
  );

  protected readonly dirty = computed(() => {
    const stored = this.report();
    const now = this.form();
    return (
      this.fields.some((f) => now[f.key] !== stored[f.key]) ||
      now.photos.length !== stored.photos.length ||
      now.photos.some((p, i) => p !== stored.photos[i])
    );
  });

  protected readonly canSubmit = computed(() => {
    const now = this.form();
    return this.editable() && now.tasksDone.trim().length > 0 && now.skillsLearned.trim().length > 0;
  });

  constructor() {
    // Fill the form when the week changes or the stored report changes.
    effect(() => {
      const stored = this.report();
      untracked(() =>
        this.form.set({
          tasksDone: stored.tasksDone,
          skillsLearned: stored.skillsLearned,
          problems: stored.problems,
          plansNextWeek: stored.plansNextWeek,
          photos: [...stored.photos],
        }),
      );
    });
  }

  protected setText(key: TextKey, event: Event): void {
    const value = String((event as CustomEvent).detail.value ?? '');
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected removePhoto(index: number): void {
    this.form.update((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
  }

  protected async addPhotos(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      if (this.form().photos.length >= MAX_REPORT_PHOTOS) {
        await this.toast(this.text.photoMax, 'warning');
        return;
      }
      try {
        const url = await toSmallDataUrl(file);
        this.form.update((f) => ({ ...f, photos: [...f.photos, url] }));
      } catch {
        await this.toast(this.text.photoFailed, 'danger');
      }
    }
  }

  protected async save(): Promise<void> {
    const result = this.store.saveDraft(ME, this.week(), this.form());
    await this.toast(result.ok ? this.text.saved : this.text.readOnly(this.statusText()), result.ok ? 'success' : 'danger');
  }

  protected async confirmSubmit(): Promise<void> {
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
      await this.submit();
    }
  }

  protected async exportPdf(): Promise<void> {
    await this.toast(this.text.exportLater, 'medium');
  }

  private async submit(): Promise<void> {
    const result = this.store.submit(ME, this.week(), this.form());
    if (!result.ok) {
      await this.toast(this.text.submitFailed, 'danger');
      return;
    }
    await this.toast(this.text.submitted, 'success');
    await this.router.navigateByUrl('/ojt/reports');
  }

  private async toast(message: string, color: string): Promise<void> {
    const toast = await this.toasts.create({ message, duration: 2500, color });
    await toast.present();
  }
}
