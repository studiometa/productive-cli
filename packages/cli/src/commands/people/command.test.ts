import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handlePeopleCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  peopleList: vi.fn().mockResolvedValue(undefined),
  peopleGet: vi.fn().mockResolvedValue(undefined),
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

describe('people command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.peopleList).mockClear();
    vi.mocked(handlers.peopleGet).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "list" subcommand to peopleList', async () => {
    const handlers = await import('./handlers.js');

    await handlePeopleCommand('list', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.peopleList).toHaveBeenCalled();
  });

  it('should route "ls" alias to peopleList', async () => {
    const handlers = await import('./handlers.js');

    await handlePeopleCommand('ls', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.peopleList).toHaveBeenCalled();
  });

  it('should route "get" subcommand to peopleGet', async () => {
    const handlers = await import('./handlers.js');

    await handlePeopleCommand('get', ['123'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.peopleGet).toHaveBeenCalledWith(['123'], expect.anything());
  });

  it('should exit with error for unknown subcommand', async () => {
    await handlePeopleCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown people subcommand: unknown'),
    );
  });
});
