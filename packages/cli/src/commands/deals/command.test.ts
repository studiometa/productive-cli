import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleDealsCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  dealsList: vi.fn().mockResolvedValue(undefined),
  dealsGet: vi.fn().mockResolvedValue(undefined),
  dealsAdd: vi.fn().mockResolvedValue(undefined),
  dealsUpdate: vi.fn().mockResolvedValue(undefined),
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

describe('deals command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.dealsList).mockClear();
    vi.mocked(handlers.dealsGet).mockClear();
    vi.mocked(handlers.dealsAdd).mockClear();
    vi.mocked(handlers.dealsUpdate).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "list" subcommand to dealsList', async () => {
    const handlers = await import('./handlers.js');

    await handleDealsCommand('list', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.dealsList).toHaveBeenCalled();
  });

  it('should route "ls" alias to dealsList', async () => {
    const handlers = await import('./handlers.js');

    await handleDealsCommand('ls', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.dealsList).toHaveBeenCalled();
  });

  it('should route "get" subcommand to dealsGet', async () => {
    const handlers = await import('./handlers.js');

    await handleDealsCommand('get', ['123'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.dealsGet).toHaveBeenCalledWith(['123'], expect.anything());
  });

  it('should route "add" subcommand to dealsAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleDealsCommand('add', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.dealsAdd).toHaveBeenCalled();
  });

  it('should route "create" alias to dealsAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleDealsCommand('create', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.dealsAdd).toHaveBeenCalled();
  });

  it('should route "update" subcommand to dealsUpdate', async () => {
    const handlers = await import('./handlers.js');

    await handleDealsCommand('update', ['456'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.dealsUpdate).toHaveBeenCalledWith(['456'], expect.anything());
  });

  it('should exit with error for unknown subcommand', async () => {
    await handleDealsCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown deals subcommand: unknown'),
    );
  });
});
