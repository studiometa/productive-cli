import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleTasksCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  tasksList: vi.fn().mockResolvedValue(undefined),
  tasksGet: vi.fn().mockResolvedValue(undefined),
  tasksAdd: vi.fn().mockResolvedValue(undefined),
  tasksUpdate: vi.fn().mockResolvedValue(undefined),
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

describe('tasks command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.tasksList).mockClear();
    vi.mocked(handlers.tasksGet).mockClear();
    vi.mocked(handlers.tasksAdd).mockClear();
    vi.mocked(handlers.tasksUpdate).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "list" subcommand to tasksList', async () => {
    const handlers = await import('./handlers.js');

    await handleTasksCommand('list', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.tasksList).toHaveBeenCalled();
  });

  it('should route "ls" alias to tasksList', async () => {
    const handlers = await import('./handlers.js');

    await handleTasksCommand('ls', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.tasksList).toHaveBeenCalled();
  });

  it('should route "get" subcommand to tasksGet', async () => {
    const handlers = await import('./handlers.js');

    await handleTasksCommand('get', ['123'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.tasksGet).toHaveBeenCalledWith(['123'], expect.anything());
  });

  it('should route "add" subcommand to tasksAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleTasksCommand('add', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.tasksAdd).toHaveBeenCalled();
  });

  it('should route "create" alias to tasksAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleTasksCommand('create', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.tasksAdd).toHaveBeenCalled();
  });

  it('should route "update" subcommand to tasksUpdate', async () => {
    const handlers = await import('./handlers.js');

    await handleTasksCommand('update', ['456'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.tasksUpdate).toHaveBeenCalledWith(['456'], expect.anything());
  });

  it('should exit with error for unknown subcommand', async () => {
    await handleTasksCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown tasks subcommand: unknown'),
    );
  });
});
