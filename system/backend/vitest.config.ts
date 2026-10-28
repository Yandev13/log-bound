import { defineConfig } from 'vitest/config';

// Local runs read system/backend/.env. CI gives the same values as GitHub secrets.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file. Use the process environment.
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // The tests use the shared dev project. Run the files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
