// Top-level routes. Each role group has a guard (system modules, section 6; frontend rules 2 and 7).
import { Routes } from '@angular/router';
import { groupGuard, loginGuard, startGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [startGuard], children: [] },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'ojt',
    canMatch: [groupGuard('ojt')],
    loadChildren: () => import('./shells/ojt.routes').then((m) => m.routes),
  },
  {
    path: 'facilitator',
    canMatch: [groupGuard('facilitator')],
    loadChildren: () => import('./shells/facilitator.routes').then((m) => m.routes),
  },
  {
    path: 'admin',
    canMatch: [groupGuard('admin')],
    loadChildren: () => import('./shells/admin.routes').then((m) => m.routes),
  },
  {
    path: 'profile',
    canMatch: [groupGuard('shared')],
    loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'notifications',
    canMatch: [groupGuard('shared')],
    loadComponent: () => import('./features/notifications/notifications.page').then((m) => m.NotificationsPage),
  },
  {
    path: 'sync-issues',
    canMatch: [groupGuard('shared')],
    loadComponent: () => import('./features/sync/sync-issues.page').then((m) => m.SyncIssuesPage),
  },
  // A blocked or unknown URL goes to the start page (TC-ST-ACC-01: a typed URL of another role is blocked).
  { path: '**', redirectTo: '' },
];
