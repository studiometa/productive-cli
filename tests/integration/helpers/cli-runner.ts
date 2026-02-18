/**
 * CLI runner helper for integration tests.
 *
 * Spawns the real `productive` CLI binary in a sandboxed environment.
 * No mocking — this exercises the actual binary end-to-end.
 */

import { execFile } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSandbox, type Sandbox } from './sandbox.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Path to the compiled CLI binary */
export const CLI_BIN = resolve(__dirname, '../../../packages/cli/dist/cli.js');

/** Path to the Node.js binary */
const NODE_BIN = process.execPath;

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CliRunner {
  run(...args: string[]): Promise<CliResult>;
  sandbox: Sandbox;
}

/**
 * Create a CLI runner that spawns the binary in a sandbox.
 * Call `runner.sandbox.cleanup()` in afterAll/afterEach.
 */
export async function createCliRunner(mockApiUrl: string): Promise<CliRunner> {
  const sandbox = await createSandbox({ mockApiUrl });

  async function run(...args: string[]): Promise<CliResult> {
    return new Promise((resolve) => {
      execFile(
        NODE_BIN,
        [CLI_BIN, ...args],
        {
          env: sandbox.env,
          timeout: 15_000,
        },
        (error, stdout, stderr) => {
          resolve({
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            exitCode: (error as NodeJS.ErrnoException)?.code
              ? Number((error as NodeJS.ErrnoException).code)
              : error
                ? 1
                : 0,
          });
        },
      );
    });
  }

  return { run, sandbox };
}
