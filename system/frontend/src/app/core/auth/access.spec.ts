import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AppPlatform, PlatformService } from '../platform.service';
import { Role, RouteGroup, canOpen, homePath, roleAllowedOn } from './access';
import { AuthService } from './auth.service';
import { groupGuard } from './auth.guards';

// The access table of system modules, section 6. Each row: group -> the role and platform pairs that can open it.
const EXPECTED: Record<RouteGroup, string[]> = {
  ojt: ['ojt/mobile'],
  facilitator: ['facilitator/mobile'],
  admin: ['admin/web'],
  shared: ['ojt/mobile', 'facilitator/mobile'],
};
const ROLES: Role[] = ['ojt', 'facilitator', 'admin'];
const PLATFORMS: AppPlatform[] = ['mobile', 'web'];
const GROUPS: RouteGroup[] = ['ojt', 'facilitator', 'admin', 'shared'];
const cases = ROLES.flatMap((role) =>
  PLATFORMS.flatMap((platform) => GROUPS.map((group) => ({ role, platform, group }))),
);

describe('TC-U-AUTH-03 client route guards (FR-AUTH-02, FR-AUTH-03)', () => {
  it.each(cases)('TC-U-AUTH-03 access table: $role on $platform, group $group', ({ role, platform, group }) => {
    expect(canOpen(role, platform, group)).toBe(EXPECTED[group].includes(`${role}/${platform}`));
  });

  it('TC-U-AUTH-03 a user with no role opens no group', () => {
    for (const platform of PLATFORMS) {
      for (const group of GROUPS) {
        expect(canOpen(null, platform, group)).toBe(false);
      }
    }
  });

  it('TC-U-AUTH-03 the mobile app accepts OJT and facilitator, the web app accepts admin', () => {
    expect(roleAllowedOn('ojt', 'mobile')).toBe(true);
    expect(roleAllowedOn('facilitator', 'mobile')).toBe(true);
    expect(roleAllowedOn('admin', 'mobile')).toBe(false);
    expect(roleAllowedOn('ojt', 'web')).toBe(false);
    expect(roleAllowedOn('facilitator', 'web')).toBe(false);
    expect(roleAllowedOn('admin', 'web')).toBe(true);
    expect(ROLES.map(homePath)).toEqual(['/ojt', '/facilitator', '/admin']);
  });

  describe('TC-U-AUTH-03 groupGuard', () => {
    async function runGuard(role: Role | null, platform: AppPlatform, group: RouteGroup) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: PlatformService, useValue: { platform } },
          { provide: AuthService, useValue: { ready: () => Promise.resolve(), role: signal(role) } },
        ],
      });
      const result = await TestBed.runInInjectionContext(() => groupGuard(group)({}, [], {} as never));
      return { result, router: TestBed.inject(Router) };
    }

    it.each(cases)('TC-U-AUTH-03 guard: $role on $platform, group $group', async ({ role, platform, group }) => {
      const { result, router } = await runGuard(role, platform, group);
      if (EXPECTED[group].includes(`${role}/${platform}`)) {
        expect(result).toBe(true);
      } else {
        expect(result).toBeInstanceOf(UrlTree);
        // A permitted role goes to its own home. A role that is wrong for the platform goes to login.
        const target = roleAllowedOn(role, platform) ? homePath(role) : '/login';
        expect(router.serializeUrl(result as UrlTree)).toBe(target);
      }
    });

    it('TC-U-AUTH-03 guard: no session goes to the login page', async () => {
      const { result, router } = await runGuard(null, 'mobile', 'ojt');
      expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    });
  });
});
