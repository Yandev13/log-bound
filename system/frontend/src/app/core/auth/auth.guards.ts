// Route guards for role and platform access (frontend rule 7). The server also enforces access (QR-SE-01).
import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { PlatformService } from '../platform.service';
import { RouteGroup, canOpen, homePath, roleAllowedOn } from './access';
import { AuthService } from './auth.service';

async function startPage(): Promise<UrlTree> {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platform = inject(PlatformService).platform;
  await auth.ready();
  const role = auth.role();
  return router.parseUrl(role && roleAllowedOn(role, platform) ? homePath(role) : '/login');
}

/** Lets the route match only if the role and the platform can open the group. Else go to the start page. */
export function groupGuard(group: RouteGroup): CanMatchFn {
  return async () => {
    const auth = inject(AuthService);
    const platform = inject(PlatformService).platform;
    const start = startPage();
    await auth.ready();
    return canOpen(auth.role(), platform, group) ? true : start;
  };
}

/** The empty path goes to the home of the role, or to the login page. */
export const startGuard: CanActivateFn = () => startPage();

/** A signed-in user does not see the login page again. */
export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const start = startPage();
  await auth.ready();
  return auth.role() ? start : true;
};
