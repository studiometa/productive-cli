/**
 * CLI integration tests — projects commands
 *
 * Exercises `productive projects list` and `productive projects get`
 * against the real CLI binary with a mock Productive.io API server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createCliRunner, type CliRunner } from '../helpers/cli-runner.js';
import { startMockServer, type MockServer } from '../helpers/mock-server.js';

describe('CLI: projects', () => {
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

  describe('projects list', () => {
    it('should list projects in human-readable format', async () => {
      const result = await cli.run('projects', 'list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Alpha Website');
      expect(result.stdout).toContain('Beta App');
    });

    it('should list projects in JSON format', async () => {
      const result = await cli.run('projects', 'list', '--format', 'json');

      expect(result.exitCode).toBe(0);
      // CLI JSON format: { data: [...flattened items] }
      const output = JSON.parse(result.stdout);
      const items = output.data ?? output;
      expect(Array.isArray(items)).toBe(true);
      expect(items).toHaveLength(2);
      expect(items[0].name).toBe('Alpha Website');
      expect(items[1].name).toBe('Beta App');
    });

    it('should list projects via ls alias', async () => {
      const result = await cli.run('projects', 'ls');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Alpha Website');
    });

    it('should list projects via p alias', async () => {
      const result = await cli.run('p', 'list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Alpha Website');
    });
  });

  describe('projects get', () => {
    it('should get a project by ID', async () => {
      const result = await cli.run('projects', 'get', '101');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Alpha Website');
    });

    it('should get a project in JSON format', async () => {
      const result = await cli.run('projects', 'get', '101', '--format', 'json');

      expect(result.exitCode).toBe(0);
      // CLI JSON format: { data: { ...flattened fields } }
      const output = JSON.parse(result.stdout);
      const item = output.data ?? output;
      expect(item.id).toBe('101');
      expect(item.name).toBe('Alpha Website');
    });
  });

  describe('error handling', () => {
    it('should exit with error on API 401', async () => {
      mockServer.setError('/projects', 401, 'Unauthorized');
      // --no-cache ensures we hit the mock server and don't get cached results
      const result = await cli.run('projects', 'list', '--no-cache');
      mockServer.clearErrors();

      expect(result.exitCode).not.toBe(0);
    });

    it('should exit with error on API 500', async () => {
      mockServer.setError('/projects', 500, 'Internal Server Error');
      const result = await cli.run('projects', 'list', '--no-cache');
      mockServer.clearErrors();

      expect(result.exitCode).not.toBe(0);
    });
  });
});
