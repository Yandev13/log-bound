// Role shell: a tab bar with the main pages of one role. The route data gives the tabs.
import { ChangeDetectionStrategy, Component, Type, input } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  calendarOutline,
  checkmarkDoneOutline,
  documentTextOutline,
  gridOutline,
  homeOutline,
  linkOutline,
  listOutline,
  peopleOutline,
  personOutline,
  statsChartOutline,
  timeOutline,
} from 'ionicons/icons';
import { PageKey, STRINGS } from '../strings';

export interface ShellTab {
  path: string;
  pageKey: PageKey;
  icon: string;
  /** The feature page of the tab. Without it, the tab shows a wireframe page (D-31). */
  load?: () => Promise<Type<unknown>>;
}

addIcons({
  businessOutline,
  calendarOutline,
  checkmarkDoneOutline,
  documentTextOutline,
  gridOutline,
  homeOutline,
  linkOutline,
  listOutline,
  peopleOutline,
  personOutline,
  statsChartOutline,
  timeOutline,
});

@Component({
  selector: 'app-tab-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar [slot]="slot()">
        @for (tab of tabs(); track tab.path) {
          <ion-tab-button [tab]="tab.path">
            <ion-icon aria-hidden="true" [name]="tab.icon" />
            <ion-label>{{ pages[tab.pageKey] }}</ion-label>
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabShellPage {
  readonly tabs = input.required<ShellTab[]>();
  /** Bottom on mobile, top on the admin web app. */
  readonly slot = input<'bottom' | 'top'>('bottom');
  protected readonly pages = STRINGS.pages;
}
