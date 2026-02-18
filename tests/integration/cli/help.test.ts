/**
 * CLI integration tests — help output
 *
 * Verifies the real binary produces expected --help output.
 * No mock server needed — help is static.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createCliRunner, type CliRunner } from '../helpers/cli-runner.js';
import { startMockServer, type MockServer } from '../helpers/mock-server.js';

describe('CLI: help', () => {
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

  it('should print help with --help', async () => {
    const result = await cli.run('--help');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('productive-cli');
    expect(result.stdout).toContain('USAGE');
    expect(result.stdout).toContain('productive');
  });

  it('should show projects subcommands in help', async () => {
    const result = await cli.run('--help');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('projects');
    expect(result.stdout).toContain('list');
  });

  it('should show time subcommands in help', async () => {
    const result = await cli.run('--help');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('time');
  });

  it('should print projects subcommand help', async () => {
    const result = await cli.run('projects', '--help');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('projects');
  });

  it('should print time subcommand help', async () => {
    const result = await cli.run('time', '--help');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('time');
  });
});
