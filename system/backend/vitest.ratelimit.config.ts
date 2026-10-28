import { defineConfig } from 'vitest/config';

// The rate limit suite (TC-U-AUTH-04, D-43). Run it alone: npm run test:ratelimit
// It is not in vitest.config.ts, because it blocks the logins of this IP address for 5 minutes.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file. Use the process environment.
}

export default defineConfig({
  test: {
    include: ['tests-ratelimit/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
