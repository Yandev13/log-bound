// Status badge (mood board): one color and one text for each report or correction status.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonBadge } from '@ionic/angular';
import { UI_STRINGS } from '../strings-ui';

const COLORS: Record<string, string> = {
  draft: 'medium',
  submitted: 'warning',
  pending: 'warning',
  approved: 'success',
  returned: 'danger',
  rejected: 'danger',
  none: 'light',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonBadge],
  template: `<ion-badge [color]="color()">{{ text() }}</ion-badge>`,
})
export class StatusBadgeComponent {
  /** draft, submitted, approved, returned, pending, rejected, or none. */
  readonly status = input.required<string>();
  protected readonly color = computed(() => COLORS[this.status()] ?? 'medium');
  protected readonly text = computed(() => UI_STRINGS.status[this.status() as keyof typeof UI_STRINGS.status] ?? this.status());
}
