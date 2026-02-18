/**
 * CLI integration tests — config commands
 *
 * Tests config get/set/validate using the real binary and filesystem sandbox.
 * No mock server needed — config is filesystem-only.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createCliRunner, type CliRunner } from '../helpers/cli-runner.js';
import { startMockServer, type MockServer } from '../helpers/mock-server.js';

describe('CLI: config', () => {
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

  it('should show config values', async () => {
    const result = await cli.run('config', 'get');

    expect(result.exitCode).toBe(0);
    // apiToken is masked
    expect(result.stdout).toContain('apiToken');
    expect(result.stdout).toContain('organizationId');
  });

  it('should show a specific config value', async () => {
    const result = await cli.run('config', 'get', 'organizationId');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('test-org-456');
  });

  it('should set a config value in the sandbox', async () => {
    const result = await cli.run('config', 'set', 'userId', 'new-user-999');

    // config set writes to the sandboxed XDG_CONFIG_HOME — no real FS writes
    expect(result.exitCode).toBe(0);
  });

  it('should validate config', async () => {
    const result = await cli.run('config', 'validate');

    expect(result.exitCode).toBe(0);
    // Should indicate valid config (env vars are always present in sandbox)
    expect(result.stdout.toLowerCase()).toMatch(/valid|ok|configured/);
  });
});
