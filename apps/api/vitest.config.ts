import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env['TEST_DATABASE_URL'] ??
        process.env['DATABASE_URL'] ??
        'postgresql://devsync:devsync@localhost:5432/devsync_test',
      JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-test-secret',
      RATE_LIMIT_ENABLED: 'false',
      COOKIE_SECURE: 'false',
      WEB_ORIGIN: 'http://localhost:5173',
    },
    // Tests share one database; unique data per test, files run sequentially.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
