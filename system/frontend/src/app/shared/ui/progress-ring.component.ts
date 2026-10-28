// Circular progress bar (mood board "progress ring"). Two arcs: the main value, and an optional second
// value behind it (for example, approved hours over logged hours). Colors are Ionic theme colors.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

@Component({
  selector: 'app-progress-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ring" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() / 9" role="progressbar"
      aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="clamped()" [attr.aria-label]="label()">
      <svg viewBox="0 0 120 120">
        <circle class="track" cx="60" cy="60" [attr.r]="radius" />
        @if (secondary() !== null) {
          <circle class="arc secondary" cx="60" cy="60" [attr.r]="radius"
            [style.stroke]="'var(--ion-color-' + secondaryColor() + ')'"
            [attr.stroke-dasharray]="circumference" [attr.stroke-dashoffset]="offset(secondary()!)" />
        }
        <circle class="arc" cx="60" cy="60" [attr.r]="radius"
          [style.stroke]="'var(--ion-color-' + color() + ')'"
          [attr.stroke-dasharray]="circumference" [attr.stroke-dashoffset]="offset(clamped())" />
      </svg>
      <div class="center">
        <span class="value">{{ clamped() }}%</span>
        @if (caption()) {
          <span class="caption">{{ caption() }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    .ring {
      position: relative;
      margin: 0 auto;
    }
    svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    circle {
      fill: none;
      stroke-width: 10;
    }
    .track {
      stroke: var(--ion-color-light-shade, #e0e0e0);
    }
    .arc {
      stroke-linecap: round;
      transition: stroke-dashoffset 0.6s ease;
    }
    .secondary {
      opacity: 0.35;
    }
    .center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .value {
      font-size: 1.6em;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .caption {
      font-size: max(0.75em, 10px);
      color: var(--ion-color-medium-shade);
      max-width: 70%;
    }
  `,
})
export class ProgressRingComponent {
  /** Percent, 0 to 100. */
  readonly value = input.required<number>();
  /** Optional second percent behind the main arc. */
  readonly secondary = input<number | null>(null);
  readonly size = input(160);
  readonly color = input('primary');
  readonly secondaryColor = input('primary');
  readonly caption = input('');
  readonly label = input('Progress');

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;
  protected readonly clamped = computed(() => Math.max(0, Math.min(100, Math.round(this.value()))));

  protected offset(percent: number): number {
    return CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, percent)) / 100);
  }
}
