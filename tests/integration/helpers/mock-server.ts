/**
 * Lightweight mock Productive.io API server.
 *
 * Serves canned JSON:API fixtures on a random port.
 * Validates Authorization and X-Organization-Id headers.
 * Supports per-test error overrides.
 */

import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '../fixtures');

/** Load a fixture file synchronously */
function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf-8'));
}

export interface MockServerOptions {
  /** Expected API token (default: 'test-token-123') */
  apiToken?: string;
  /** Expected org ID (default: 'test-org-456') */
  orgId?: string;
}

export interface MockServer {
  /** Base URL like http://localhost:PORT */
  url: string;
  /** The /api/v2 prefixed URL, ready to set as PRODUCTIVE_BASE_URL */
  apiUrl: string;
  /** Override a route to return an error for next N requests (default: indefinitely) */
  setError(route: string, statusCode: number, message?: string): void;
  /** Clear all error overrides */
  clearErrors(): void;
  /** Stop the server */
  close(): Promise<void>;
}

/** Start a mock Productive.io API server on a random port */
export async function startMockServer(options: MockServerOptions = {}): Promise<MockServer> {
  const expectedToken = options.apiToken ?? 'test-token-123';
  const expectedOrgId = options.orgId ?? 'test-org-456';

  const errorOverrides = new Map<string, { statusCode: number; message: string }>();

  function setError(route: string, statusCode: number, message = 'Mock error') {
    errorOverrides.set(route, { statusCode, message });
  }

  function clearErrors() {
    errorOverrides.clear();
  }

  const server = createServer((req, res) => {
    // Validate auth headers
    // CLI uses X-Auth-Token + X-Organization-Id (Productive.io API format)
    const authToken = req.headers['x-auth-token'];
    const orgHeader = req.headers['x-organization-id'];

    if (!authToken || authToken !== expectedToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ title: 'Unauthorized', status: '401' }] }));
      return;
    }

    if (!orgHeader || orgHeader !== expectedOrgId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ title: 'Forbidden', status: '403' }] }));
      return;
    }

    // Strip /api/v2 prefix and query string for routing
    const urlWithoutPrefix = (req.url ?? '/').replace(/^\/api\/v2/, '');
    const path = urlWithoutPrefix.split('?')[0];

    // Check for error overrides
    const errorOverride = errorOverrides.get(path);
    if (errorOverride) {
      res.writeHead(errorOverride.statusCode, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          errors: [{ title: errorOverride.message, status: String(errorOverride.statusCode) }],
        }),
      );
      return;
    }

    // Route to fixture
    const body = resolveRoute(req.method ?? 'GET', path);

    if (body === null) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ title: 'Not Found', status: '404' }] }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/vnd.api+json' });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Unexpected server address'));
        return;
      }

      const baseUrl = `http://127.0.0.1:${addr.port}`;
      const apiUrl = `${baseUrl}/api/v2`;

      resolve({
        url: baseUrl,
        apiUrl,
        setError,
        clearErrors,
        // eslint-disable-next-line no-promise-executor-return
        close: () =>
          // oxlint-disable-next-line no-multiple-resolved -- false positive: inner promise is independent
          new Promise<void>((done, fail) => server.close((err) => (err ? fail(err) : done()))),
      });
    });
  });
}

/**
 * Route a request to the appropriate fixture.
 * Returns the fixture body, or null for 404.
 */
function resolveRoute(method: string, path: string): unknown {
  // Projects
  if (method === 'GET' && path === '/projects') return loadFixture('projects-list');
  if (method === 'GET' && /^\/projects\/\d+$/.test(path)) return loadFixture('projects-get');

  // Tasks
  if (method === 'GET' && path === '/tasks') return loadFixture('tasks-list');

  // Time entries
  if (method === 'GET' && path === '/time_entries') return loadFixture('time-entries-list');
  if (method === 'DELETE' && /^\/time_entries\/\d+$/.test(path)) {
    return ''; // 200 empty body for DELETE
  }

  // People
  if (method === 'GET' && path === '/people') return loadFixture('people-list');

  return null;
}
