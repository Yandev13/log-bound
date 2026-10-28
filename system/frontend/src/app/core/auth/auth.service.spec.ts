import { TestBed } from '@angular/core/testing';
import type { AuthError } from '@supabase/supabase-js';
import { Profile, ProfileRepository } from '../../data/repositories/profile.repository';
import { AppPlatform, PlatformService } from '../platform.service';
import { SUPABASE } from '../supabase.client';
import { Role } from './access';
import { AuthService, signInFailureOf } from './auth.service';

// The fake client has the same result shapes as supabase-js. The backend L2 tests examine the real Auth server.
function fakeSupabase(opts: { error?: Partial<AuthError>; sessionUserId?: string } = {}) {
  const auth = {
    signInWithPassword: vi.fn(async () =>
      opts.error
        ? { data: { user: null, session: null }, error: opts.error as AuthError }
        : { data: { user: { id: 'u1' }, session: { access_token: 'a' } }, error: null },
    ),
    signOut: vi.fn(async () => ({ error: null })),
    getSession: vi.fn(async () => ({
      data: { session: opts.sessionUserId ? { user: { id: opts.sessionUserId } } : null },
      error: null,
    })),
  };
  return { auth };
}

function setup(
  platform: AppPlatform,
  profile: Profile | null | Error,
  client = fakeSupabase(),
  localProfile: Profile | null = null,
) {
  const fetchById = vi.fn(async () => {
    if (profile instanceof Error) {
      throw profile;
    }
    return profile;
  });
  const cacheLocal = vi.fn(async () => undefined);
  const getLocal = vi.fn(async () => localProfile);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: SUPABASE, useValue: client },
      { provide: PlatformService, useValue: { platform } },
      { provide: ProfileRepository, useValue: { fetchById, cacheLocal, getLocal } },
    ],
  });
  return { service: TestBed.inject(AuthService), client, fetchById, cacheLocal, getLocal };
}

const profileOf = (role: Role, status: Profile['status'] = 'active'): Profile => ({
  id: 'u1',
  role,
  fullName: 'Test',
  status,
});

describe('TC-CI-AUTH-02 platform restriction in the client (FR-AUTH-03, D-38)', () => {
  it('TC-CI-AUTH-02 an admin login in the mobile client signs out at once and keeps no profile', async () => {
    const { service, client } = setup('mobile', profileOf('admin'));
    const result = await service.signIn('admin@test.local', 'x');
    expect(result).toEqual({ ok: false, reason: 'wrong-platform' });
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
    expect(service.profile()).toBeNull();
    expect(service.role()).toBeNull();
  });

  it.each<Role>(['ojt', 'facilitator'])(
    'TC-CI-AUTH-02 a %s login in the web client signs out at once and keeps no profile',
    async (role) => {
      const { service, client } = setup('web', profileOf(role));
      const result = await service.signIn(`${role}@test.local`, 'x');
      expect(result).toEqual({ ok: false, reason: 'wrong-platform' });
      expect(client.auth.signOut).toHaveBeenCalledTimes(1);
      expect(service.profile()).toBeNull();
    },
  );

  it.each<[Role, AppPlatform, string]>([
    ['ojt', 'mobile', '/ojt'],
    ['facilitator', 'mobile', '/facilitator'],
    ['admin', 'web', '/admin'],
  ])('TC-CI-AUTH-02 a %s login on %s is accepted and goes to %s', async (role, platform, home) => {
    const { service, client } = setup(platform, profileOf(role));
    const result = await service.signIn(' user@test.local ', 'x');
    expect(result).toEqual({ ok: true, home });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'user@test.local', password: 'x' });
    expect(client.auth.signOut).not.toHaveBeenCalled();
    expect(service.role()).toBe(role);
  });
});

describe('AuthService login results (FR-AUTH-01, QR-IC-04)', () => {
  it('maps the Auth errors to causes that the login page shows', () => {
    expect(signInFailureOf({ status: 400, code: 'invalid_credentials' } as AuthError)).toBe('invalid-credentials');
    expect(signInFailureOf({ status: 429 } as AuthError)).toBe('rate-limited');
    expect(signInFailureOf({ status: 0, name: 'AuthRetryableFetchError' } as AuthError)).toBe('network');
    expect(signInFailureOf({ status: 500 } as AuthError)).toBe('unknown');
  });

  it('gives the cause of a failed login and does not load a profile', async () => {
    const { service, fetchById } = setup('mobile', profileOf('ojt'), fakeSupabase({ error: { status: 400 } }));
    expect(await service.signIn('ojt1@test.local', 'wrong')).toEqual({ ok: false, reason: 'invalid-credentials' });
    expect(fetchById).not.toHaveBeenCalled();
  });

  it('signs out an inactive account', async () => {
    const { service, client } = setup('mobile', profileOf('ojt', 'inactive'));
    expect(await service.signIn('ojt1@test.local', 'x')).toEqual({ ok: false, reason: 'inactive' });
    expect(client.auth.signOut).toHaveBeenCalled();
  });

  it('does not keep a session without a role when the profile does not load', async () => {
    const { service, client } = setup('mobile', new Error('fetch failed'));
    expect(await service.signIn('ojt1@test.local', 'x')).toEqual({ ok: false, reason: 'network' });
    expect(client.auth.signOut).toHaveBeenCalled();
  });
});

describe('TC-CI-AUTH-03 password change needs the old password (FR-AUTH-06)', () => {
  function clientWith(opts: { oldOk: boolean; updateError?: Partial<AuthError> }) {
    const client = fakeSupabase();
    const auth = client.auth as Record<string, unknown>;
    auth['getUser'] = vi.fn(async () => ({ data: { user: { id: 'u1', email: 'ojt5@test.local' } }, error: null }));
    auth['signInWithPassword'] = vi.fn(async () =>
      opts.oldOk
        ? { data: { user: { id: 'u1' }, session: {} }, error: null }
        : { data: { user: null, session: null }, error: { status: 400, code: 'invalid_credentials' } as AuthError },
    );
    auth['updateUser'] = vi.fn(async () => ({ data: {}, error: (opts.updateError as AuthError) ?? null }));
    return client;
  }

  it('TC-CI-AUTH-03 a wrong old password stops the change', async () => {
    const client = clientWith({ oldOk: false });
    const { service } = setup('mobile', profileOf('ojt'), client);
    expect(await service.changePassword('wrong', 'new-password-1')).toEqual({ ok: false, reason: 'wrong-old-password' });
    expect((client.auth as Record<string, ReturnType<typeof vi.fn>>)['updateUser']).not.toHaveBeenCalled();
  });

  it('TC-CI-AUTH-03 the correct old password lets the change continue', async () => {
    const client = clientWith({ oldOk: true });
    const { service } = setup('mobile', profileOf('ojt'), client);
    expect(await service.changePassword('old', 'new-password-1')).toEqual({ ok: true });
    expect((client.auth as Record<string, ReturnType<typeof vi.fn>>)['updateUser']).toHaveBeenCalledWith({
      password: 'new-password-1',
    });
  });

  it('TC-CI-AUTH-03 a weak new password gives the cause', async () => {
    const client = clientWith({ oldOk: true, updateError: { status: 422, code: 'weak_password' } });
    const { service } = setup('mobile', profileOf('ojt'), client);
    expect(await service.changePassword('old', 'short')).toEqual({ ok: false, reason: 'weak-password' });
  });
});

describe('AuthService session restore (frontend rule 12, QR-RE-08)', () => {
  it('restores the role of a stored session', async () => {
    const { service } = setup('mobile', profileOf('ojt'), fakeSupabase({ sessionUserId: 'u1' }));
    await service.ready();
    expect(service.role()).toBe('ojt');
  });

  it('keeps the session when the network fails during the restore', async () => {
    const { service, client } = setup('mobile', new Error('fetch failed'), fakeSupabase({ sessionUserId: 'u1' }));
    await service.ready();
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  it('uses the local copy of the profile when the network fails (FR-AUTH-04)', async () => {
    const { service, getLocal } = setup(
      'mobile',
      new Error('fetch failed'),
      fakeSupabase({ sessionUserId: 'u1' }),
      profileOf('ojt'),
    );
    await service.ready();
    expect(getLocal).toHaveBeenCalledWith('u1');
    expect(service.role()).toBe('ojt');
  });

  it('keeps a local copy of the profile after a login', async () => {
    const { service, cacheLocal } = setup('mobile', profileOf('facilitator'));
    await service.signIn('fac1@test.local', 'x');
    expect(cacheLocal).toHaveBeenCalledWith(profileOf('facilitator'));
  });

  it('ends a stored session of a role that is wrong for the platform', async () => {
    const { service, client } = setup('mobile', profileOf('admin'), fakeSupabase({ sessionUserId: 'u1' }));
    await service.ready();
    expect(service.role()).toBeNull();
    expect(client.auth.signOut).toHaveBeenCalled();
  });

  it('TC-SI-AUTH-02 (unit part): with a local profile, the start does not wait for the server (DEF-016)', async () => {
    const { service, fetchById } = setup('mobile', profileOf('ojt'), fakeSupabase({ sessionUserId: 'u1' }), profileOf('ojt'));
    fetchById.mockImplementation(() => new Promise(() => undefined)); // The server never answers.
    await service.ready();
    expect(service.role()).toBe('ojt');
  });

  it('TC-SI-AUTH-02 (unit part): the server check after the start still ends the session of an inactive account', async () => {
    const { service, client } = setup('mobile', profileOf('ojt', 'inactive'), fakeSupabase({ sessionUserId: 'u1' }), profileOf('ojt'));
    await service.ready();
    await vi.waitFor(() => expect(client.auth.signOut).toHaveBeenCalled());
    expect(service.role()).toBeNull();
  });

  it('does nothing when no session is stored', async () => {
    const { service, fetchById } = setup('mobile', profileOf('ojt'));
    await service.ready();
    expect(service.role()).toBeNull();
    expect(fetchById).not.toHaveBeenCalled();
  });
});
