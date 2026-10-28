import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { SyncSessionService } from './core/sync-session.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // Starts and stops the sync with the login state (FR-SYNC-02).
    inject(SyncSessionService);
  }
}
