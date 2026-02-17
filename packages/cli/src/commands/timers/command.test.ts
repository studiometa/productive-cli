import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleTimersCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  timersList: vi.fn().mockResolvedValue(undefined),
  timersGet: vi.fn().mockResolvedValue(undefined),
  timersStart: vi.fn().mockResolvedValue(undefined),
  timersStop: vi.fn().mockResolvedValue(undefined),
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

describe('timers command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.timersList).mockClear();
    vi.mocked(handlers.timersGet).mockClear();
    vi.mocked(handlers.timersStart).mockClear();
    vi.mocked(handlers.timersStop).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "list" subcommand to timersList', async () => {
    const handlers = await import('./handlers.js');

    await handleTimersCommand('list', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timersList).toHaveBeenCalled();
  });

  it('should route "ls" alias to timersList', async () => {
    const handlers = await import('./handlers.js');

    await handleTimersCommand('ls', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timersList).toHaveBeenCalled();
  });

  it('should route "get" subcommand to timersGet', async () => {
    const handlers = await import('./handlers.js');

    await handleTimersCommand('get', ['123'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timersGet).toHaveBeenCalledWith(['123'], expect.anything());
  });

  it('should route "start" subcommand to timersStart', async () => {
    const handlers = await import('./handlers.js');

    await handleTimersCommand('start', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timersStart).toHaveBeenCalled();
  });

  it('should route "stop" subcommand to timersStop', async () => {
    const handlers = await import('./handlers.js');

    await handleTimersCommand('stop', ['456'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.timersStop).toHaveBeenCalledWith(['456'], expect.anything());
  });

  it('should exit with error for unknown subcommand', async () => {
    await handleTimersCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown timers subcommand: unknown'),
    );
  });
});
