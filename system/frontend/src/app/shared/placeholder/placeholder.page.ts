// A wireframe page for each screen that is not built yet (D-31). The route data gives the title key.
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { PageKey, STRINGS } from '../strings';
import { PlaceholderComponent } from './placeholder.component';

@Component({
  selector: 'app-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, PageHeaderComponent, PlaceholderComponent],
  template: `
    <app-page-header [title]="title()" />
    <ion-content class="ion-padding">
      <app-placeholder [label]="title().toUpperCase()" />
      <p>{{ strings.placeholderNote }}</p>
      @if (auth.profile(); as p) {
        <p>{{ p.fullName }} ({{ p.role }})</p>
      }
    </ion-content>
  `,
})
export class PlaceholderPage {
  /** Bound from the route data (withComponentInputBinding). */
  readonly pageKey = input.required<PageKey>();
  readonly title = computed(() => STRINGS.pages[this.pageKey()]);
  protected readonly strings = STRINGS;
  protected readonly auth = inject(AuthService);
}
