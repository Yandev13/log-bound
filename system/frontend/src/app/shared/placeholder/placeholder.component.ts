import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One shared box for each missing asset, for example a box with the text "LOGO" (D-31). */
@Component({
  selector: 'app-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="placeholder" role="img" [attr.aria-label]="label()">{{ label() }}</div>`,
  styles: `
    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 96px;
      border: 2px dashed var(--ion-color-medium);
      border-radius: 8px;
      color: var(--ion-color-medium-shade);
      font-weight: 600;
      letter-spacing: 0.1em;
    }
  `,
})
export class PlaceholderComponent {
  readonly label = input.required<string>();
}
