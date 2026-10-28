import { describe, expect, it } from 'vitest';
import { newClient } from '../tests/helpers';

// TC-U-AUTH-04 (QR-SE-08, D-22). CAUTION: this test uses up the sign-in limit of this IP address for
// 5 minutes. All logins from this address fail in that time. Thus it is a separate suite (D-43):
//   npm run test:ratelimit
// The client part (the wait message for HTTP 429) is in the frontend auth.service.spec.ts.
describe('TC-U-AUTH-04 login rate limit', () => {
  it('TC-U-AUTH-04 a burst of failed logins from one client gets HTTP 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 40 && !statuses.includes(429); i++) {
      const { error } = await newClient().auth.signInWithPassword({
        email: 'nobody@test.local',
        password: `wrong-password-${i}`,
      });
      statuses.push(error?.status ?? 200);
    }
    expect(statuses).toContain(429);
    // Before the limit, each failed login gives 400 (not a success).
    expect(statuses.filter((s) => s !== 429).every((s) => s === 400)).toBe(true);
  }, 120_000);
});
