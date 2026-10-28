// Facilitator shell (mobile). Route group /facilitator/* (system modules, section 6).
import { Routes } from '@angular/router';
import { shellRoutes } from '../shared/shell/shell-routes';

export const routes: Routes = shellRoutes(
  [
    {
      path: 'overview',
      pageKey: 'facOverview',
      icon: 'grid-outline',
      load: () => import('../features/monitoring/facilitator-home.page').then((m) => m.FacilitatorHomePage),
    },
    {
      path: 'ojts',
      pageKey: 'facOjts',
      icon: 'people-outline',
      load: () => import('../features/dtr/my-ojts.page').then((m) => m.MyOjtsPage),
    },
    {
      path: 'reviews',
      pageKey: 'facReviews',
      icon: 'checkmark-done-outline',
      load: () => import('../features/reviews/reviews.page').then((m) => m.ReviewsPage),
    },
  ],
  'bottom',
  [
    { path: 'ojts/:ojtId', loadComponent: () => import('../features/dtr/ojt-dtr.page').then((m) => m.OjtDtrPage) },
    { path: 'overview/:ojtId', loadComponent: () => import('../features/monitoring/ojt-overview.page').then((m) => m.OjtOverviewPage) },
    { path: 'reviews/report/:id', loadComponent: () => import('../features/reviews/report-review.page').then((m) => m.ReportReviewPage) },
    { path: 'reviews/correction/:id', loadComponent: () => import('../features/reviews/correction-review.page').then((m) => m.CorrectionReviewPage) },
  ],
);
