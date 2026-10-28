// Admin shell (web). Route group /admin/* (system modules, section 6).
import { Routes } from '@angular/router';
import { shellRoutes } from '../shared/shell/shell-routes';

export const routes: Routes = shellRoutes(
  [
    { path: 'dashboard', pageKey: 'adminDashboard', icon: 'grid-outline' },
    { path: 'users', pageKey: 'adminUsers', icon: 'person-outline' },
    { path: 'companies', pageKey: 'adminCompanies', icon: 'business-outline' },
    { path: 'batches', pageKey: 'adminBatches', icon: 'calendar-outline' },
    { path: 'assignments', pageKey: 'adminAssignments', icon: 'link-outline' },
    { path: 'audit', pageKey: 'adminAudit', icon: 'list-outline' },
  ],
  'top',
);
