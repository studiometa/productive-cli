import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    // Integration tests are slower — generous timeouts
    testTimeout: 30_000,
    hookTimeout: 15_000,
    // Process isolation to avoid port conflicts between test files
    pool: 'forks',
    fileParallelism: false,
    include: ['tests/integration/**/*.test.ts'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: {
      junit: './test-results/integration-junit.xml',
    },
  },
});
