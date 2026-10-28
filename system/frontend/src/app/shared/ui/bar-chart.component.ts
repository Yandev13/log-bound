// Bar chart (mood board "bar chart"): one bar for each item, with an optional target line.
// Tap a bar to select it. The parent gets the index of the selected bar.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
  /** Text above the bar, for example "8.0". */
  valueText?: string;
  /** Ionic color name. Default: primary. */
  color?: string;
}

@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart" [style.height.px]="height()" role="list" [attr.aria-label]="label()">
      @if (target() !== null && max() > 0) {
        <div class="target" [style.bottom.%]="(target()! / max()) * 100">
          <span>{{ targetText() }}</span>
        </div>
      }
      @for (item of items(); track $index) {
        <button type="button" class="col" role="listitem" [class.selected]="selected() === $index"
          [attr.aria-label]="item.label + ': ' + (item.valueText ?? item.value)" (click)="barSelect.emit($index)">
          <span class="value">{{ item.valueText ?? item.value }}</span>
          <span class="bar" [style.height.%]="max() ? (item.value / max()) * 100 : 0"
            [style.background]="'var(--ion-color-' + (item.color ?? 'primary') + ')'"></span>
          <span class="label">{{ item.label }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .chart {
      position: relative;
      display: flex;
      align-items: stretch;
      gap: 6px;
      padding-top: 18px;
    }
    .col {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      background: none;
      border: 0;
      padding: 0;
      min-width: 0;
      color: inherit;
      font: inherit;
    }
    .bar {
      width: 70%;
      min-height: 2px;
      border-radius: 4px 4px 0 0;
      transition: height 0.4s ease;
    }
    .selected .bar {
      outline: 2px solid var(--ion-color-dark);
      outline-offset: 1px;
    }
    .value {
      font-size: 0.65em;
      color: var(--ion-color-medium-shade);
      font-variant-numeric: tabular-nums;
    }
    .label {
      font-size: 0.7em;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .target {
      position: absolute;
      left: 0;
      right: 0;
      border-top: 1px dashed var(--ion-color-medium);
      margin-bottom: 1.4em;
      pointer-events: none;
    }
    .target span {
      position: absolute;
      right: 0;
      top: -1.3em;
      font-size: 0.6em;
      color: var(--ion-color-medium-shade);
    }
  `,
})
export class BarChartComponent {
  readonly items = input.required<BarItem[]>();
  readonly height = input(160);
  /** A dashed line at this value, for example the hours of a full work day. */
  readonly target = input<number | null>(null);
  readonly targetText = input('');
  readonly selected = input<number | null>(null);
  readonly label = input('Chart');
  readonly barSelect = output<number>();

  protected readonly max = computed(() => Math.max(this.target() ?? 0, ...this.items().map((i) => i.value), 0));
}
