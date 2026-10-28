// A small number tile: a label, a large value, and an optional note (for example "Logged hours: 212.5").
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tile" [style.border-left-color]="'var(--ion-color-' + color() + ')'">
      <span class="label">{{ label() }}</span>
      <span class="value">{{ value() }}</span>
      @if (note()) {
        <span class="note">{{ note() }}</span>
      }
    </div>
  `,
  styles: `
    .tile {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      border-radius: 8px;
      border-left: 4px solid;
      background: var(--ion-color-light, #f4f5f8);
      height: 100%;
    }
    .label {
      font-size: 0.75em;
      color: var(--ion-color-medium-shade);
    }
    .value {
      font-size: 1.3em;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .note {
      font-size: 0.7em;
      color: var(--ion-color-medium-shade);
    }
  `,
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly note = input('');
  readonly color = input('primary');
}
