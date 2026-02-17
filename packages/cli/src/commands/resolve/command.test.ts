import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleResolveCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  resolveIdentifier: vi.fn().mockResolvedValue(undefined),
  detectType: vi.fn().mockResolvedValue(undefined),
}));

// Mock config to avoid file system access
vi.mock('../../config.js', () => ({
  getConfig: vi.fn().mockReturnValue({
    apiToken: 'test-token',
    organizationId: 'test-org',
    baseUrl: 'https://api.productive.io/api/v2',
  }),
}));

// Mock cache with full interface - factory must be inline
vi.mock('../../utils/cache.js', () => {
  const mockCacheObj = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    setOrgId: vi.fn(),
    getCachedPeople: vi.fn(),
    getCachedProjects: vi.fn(),
    getCachedTaskLists: vi.fn(),
    findCachedPersonByEmail: vi.fn(),
    findCachedProjectByNumber: vi.fn(),
    findCachedTaskListByName: vi.fn(),
  };
  return {
    getCache: vi.fn().mockReturnValue(mockCacheObj),
    CacheStore: vi.fn().mockImplementation(() => mockCacheObj),
  };
});

describe('resolve command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.resolveIdentifier).mockClear();
    vi.mocked(handlers.detectType).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "detect" subcommand to detectType', async () => {
    const handlers = await import('./handlers.js');

    await handleResolveCommand('detect', ['test@example.com'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.detectType).toHaveBeenCalledWith(['test@example.com'], expect.anything());
  });

  it('should route query to resolveIdentifier', async () => {
    const handlers = await import('./handlers.js');

    await handleResolveCommand('test@example.com', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.resolveIdentifier).toHaveBeenCalledWith(
      ['test@example.com'],
      expect.anything(),
    );
  });

  it('should combine subcommand and args as query for resolveIdentifier', async () => {
    const handlers = await import('./handlers.js');

    await handleResolveCommand('john', ['doe'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.resolveIdentifier).toHaveBeenCalledWith(['john', 'doe'], expect.anything());
  });

  it('should exit with error when no query provided', async () => {
    await handleResolveCommand(undefined, [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Query argument is required'),
    );
  });
});
