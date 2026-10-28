// OJT shell (mobile). Route group /ojt/* (system modules, section 6).
import { Routes } from '@angular/router';
import { shellRoutes } from '../shared/shell/shell-routes';

export const routes: Routes = shellRoutes(
  [
    { path: 'home', pageKey: 'ojtHome', icon: 'home-outline', load: () => import('../features/monitoring/ojt-home.page').then((m) => m.OjtHomePage) },
    { path: 'dtr', pageKey: 'ojtDtr', icon: 'time-outline', load: () => import('../features/dtr/dtr.page').then((m) => m.DtrPage) },
    { path: 'reports', pageKey: 'ojtReports', icon: 'document-text-outline', load: () => import('../features/reports/reports.page').then((m) => m.ReportsPage) },
    { path: 'progress', pageKey: 'ojtProgress', icon: 'stats-chart-outline', load: () => import('../features/monitoring/progress.page').then((m) => m.ProgressPage) },
  ],
  'bottom',
  [
    { path: 'reports/:week', loadComponent: () => import('../features/reports/report-editor.page').then((m) => m.ReportEditorPage) },
    { path: 'corrections', loadComponent: () => import('../features/corrections/corrections.page').then((m) => m.CorrectionsPage) },
    { path: 'corrections/new', loadComponent: () => import('../features/corrections/correction-form.page').then((m) => m.CorrectionFormPage) },
    { path: 'export', loadComponent: () => import('../features/export/export.page').then((m) => m.ExportPage) },
  ],
);
