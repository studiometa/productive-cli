/**
 * CLI integration tests — custom-fields commands
 *
 * Exercises `productive custom-fields list` and `productive custom-fields get`
 * against the real CLI binary with a mock Productive.io API server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createCliRunner, type CliRunner } from '../helpers/cli-runner.js';
import { startMockServer, type MockServer } from '../helpers/mock-server.js';

describe('CLI: custom-fields', () => {
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

  describe('custom-fields list', () => {
    it('should list custom fields in human-readable format', async () => {
      const result = await cli.run('custom-fields', 'list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Semaine');
      expect(result.stdout).toContain('Points');
    });

    it('should list custom fields in JSON format', async () => {
      const result = await cli.run('custom-fields', 'list', '--format', 'json');

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      const items = output.data ?? output;
      expect(Array.isArray(items)).toBe(true);
      expect(items).toHaveLength(2);
      expect(items[0].name).toBe('Semaine');
      expect(items[1].name).toBe('Points');
    });

    it('should list custom fields via ls alias', async () => {
      const result = await cli.run('custom-fields', 'ls');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Semaine');
    });
  });

  describe('custom-fields get', () => {
    it('should get a custom field by ID', async () => {
      const result = await cli.run('custom-fields', 'get', '42236');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Semaine');
    });

    it('should get a custom field in JSON format', async () => {
      const result = await cli.run('custom-fields', 'get', '42236', '--format', 'json');

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      const item = output.data ?? output;
      expect(item.id).toBe('42236');
      expect(item.name).toBe('Semaine');
    });
  });

  describe('error handling', () => {
    it('should exit with error on API 500', async () => {
      mockServer.setError('/custom_fields', 500, 'Internal Server Error');
      const result = await cli.run('custom-fields', 'list', '--no-cache');
      mockServer.clearErrors();

      expect(result.exitCode).not.toBe(0);
    });
  });
});
