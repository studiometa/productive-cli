import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleCommentsCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  commentsList: vi.fn().mockResolvedValue(undefined),
  commentsGet: vi.fn().mockResolvedValue(undefined),
  commentsAdd: vi.fn().mockResolvedValue(undefined),
  commentsUpdate: vi.fn().mockResolvedValue(undefined),
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

describe('comments command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.commentsList).mockClear();
    vi.mocked(handlers.commentsGet).mockClear();
    vi.mocked(handlers.commentsAdd).mockClear();
    vi.mocked(handlers.commentsUpdate).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "list" subcommand to commentsList', async () => {
    const handlers = await import('./handlers.js');

    await handleCommentsCommand('list', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.commentsList).toHaveBeenCalled();
  });

  it('should route "ls" alias to commentsList', async () => {
    const handlers = await import('./handlers.js');

    await handleCommentsCommand('ls', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.commentsList).toHaveBeenCalled();
  });

  it('should route "get" subcommand to commentsGet', async () => {
    const handlers = await import('./handlers.js');

    await handleCommentsCommand('get', ['123'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.commentsGet).toHaveBeenCalledWith(['123'], expect.anything());
  });

  it('should route "add" subcommand to commentsAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleCommentsCommand('add', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.commentsAdd).toHaveBeenCalled();
  });

  it('should route "create" alias to commentsAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleCommentsCommand('create', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.commentsAdd).toHaveBeenCalled();
  });

  it('should route "update" subcommand to commentsUpdate', async () => {
    const handlers = await import('./handlers.js');

    await handleCommentsCommand('update', ['456'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.commentsUpdate).toHaveBeenCalledWith(['456'], expect.anything());
  });

  it('should exit with error for unknown subcommand', async () => {
    await handleCommentsCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown comments subcommand: unknown'),
    );
  });
});
