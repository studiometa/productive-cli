import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleTimeCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  timeList: vi.fn().mockResolvedValue(undefined),
  timeGet: vi.fn().mockResolvedValue(undefined),
  timeAdd: vi.fn().mockResolvedValue(undefined),
  timeUpdate: vi.fn().mockResolvedValue(undefined),
  timeDelete: vi.fn().mockResolvedValue(undefined),
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

describe('time command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.timeList).mockClear();
    vi.mocked(handlers.timeGet).mockClear();
    vi.mocked(handlers.timeAdd).mockClear();
    vi.mocked(handlers.timeUpdate).mockClear();
    vi.mocked(handlers.timeDelete).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "list" subcommand to timeList', async () => {
    const handlers = await import('./handlers.js');

    await handleTimeCommand('list', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timeList).toHaveBeenCalled();
  });

  it('should route "ls" alias to timeList', async () => {
    const handlers = await import('./handlers.js');

    await handleTimeCommand('ls', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timeList).toHaveBeenCalled();
  });

  it('should route "get" subcommand to timeGet', async () => {
    const handlers = await import('./handlers.js');

    await handleTimeCommand('get', ['123'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timeGet).toHaveBeenCalledWith(['123'], expect.anything());
  });

  it('should route "add" subcommand to timeAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleTimeCommand('add', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timeAdd).toHaveBeenCalled();
  });

  it('should route "update" subcommand to timeUpdate', async () => {
    const handlers = await import('./handlers.js');

    await handleTimeCommand('update', ['456'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timeUpdate).toHaveBeenCalledWith(['456'], expect.anything());
  });

  it('should route "delete" subcommand to timeDelete', async () => {
    const handlers = await import('./handlers.js');

    await handleTimeCommand('delete', ['789'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timeDelete).toHaveBeenCalledWith(['789'], expect.anything());
  });

  it('should route "rm" alias to timeDelete', async () => {
    const handlers = await import('./handlers.js');

    await handleTimeCommand('rm', ['789'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timeDelete).toHaveBeenCalledWith(['789'], expect.anything());
  });

  it('should exit with error for unknown subcommand', async () => {
    await handleTimeCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown time subcommand: unknown'),
    );
  });
});
