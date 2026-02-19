/**
 * CLI integration tests — time entry commands
 *
 * Exercises `productive time list` against the real CLI binary
 * with a mock Productive.io API server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createCliRunner, type CliRunner } from '../helpers/cli-runner.js';
import { startMockServer, type MockServer } from '../helpers/mock-server.js';

describe('CLI: time', () => {
  let mockServer: MockServer;
  let cli: CliRunner;

  beforeAll(async () => {
    mockServer = await startMockServer();
    cli = await createCliRunner(mockServer.apiUrl);
  });

  afterAll(async () => {
    await cli.sandbox.cleanup();
    await mockServer.close();
  });

  describe('time list', () => {
    it('should list time entries in human-readable format', async () => {
      const result = await cli.run('time', 'list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('2024-07-15');
    });

    it('should list time entries in JSON format', async () => {
      const result = await cli.run('time', 'list', '--format', 'json');

      expect(result.exitCode).toBe(0);
      // CLI JSON format: { data: [...flattened items] }
      const output = JSON.parse(result.stdout);
      const items = output.data ?? output;
      expect(Array.isArray(items)).toBe(true);
      expect(items).toHaveLength(2);
      expect(items[0].date).toBe('2024-07-15');
      expect(items[0].time_minutes).toBe(120);
    });

    it('should list time entries via t alias', async () => {
      const result = await cli.run('t', 'list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('2024-07-15');
    });
  });

  describe('error handling', () => {
    it('should exit with error on API 401', async () => {
      mockServer.setError('/time_entries', 401, 'Unauthorized');
      // --no-cache ensures we hit the mock server and don't get cached results
      const result = await cli.run('time', 'list', '--no-cache');
      mockServer.clearErrors();

      expect(result.exitCode).not.toBe(0);
    });
  });
});
