// Role and platform access rules (system modules, section 6; FR-AUTH-02, FR-AUTH-03).
// These functions are pure, so that the unit tests can examine each pair (TC-U-AUTH-03).
import type { AppPlatform } from '../platform.service';

export type Role = 'ojt' | 'facilitator' | 'admin';

/** The route groups of system modules, section 6. `shared` is /profile, /notifications, /sync-issues. */
export type RouteGroup = 'ojt' | 'facilitator' | 'admin' | 'shared';

const ACCESS: Record<RouteGroup, readonly (readonly [Role, AppPlatform])[]> = {
  ojt: [['ojt', 'mobile']],
  facilitator: [['facilitator', 'mobile']],
  admin: [['admin', 'web']],
  shared: [
    ['ojt', 'mobile'],
    ['facilitator', 'mobile'],
  ],
};

/** True if a user of this role on this platform can open the route group. */
export function canOpen(role: Role | null, platform: AppPlatform, group: RouteGroup): boolean {
  return role !== null && ACCESS[group].some(([r, p]) => r === role && p === platform);
}

/** FR-AUTH-03: the mobile app accepts OJT and facilitator accounts. The web app accepts admin accounts. */
export function roleAllowedOn(role: Role, platform: AppPlatform): boolean {
  return platform === 'mobile' ? role === 'ojt' || role === 'facilitator' : role === 'admin';
}

/** The home route of each role. */
export function homePath(role: Role): string {
  return `/${role}`;
}

export function isRole(value: unknown): value is Role {
  return value === 'ojt' || value === 'facilitator' || value === 'admin';
}
