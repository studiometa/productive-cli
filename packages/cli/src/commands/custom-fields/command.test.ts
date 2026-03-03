import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleCustomFieldsCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  customFieldsList: vi.fn().mockResolvedValue(undefined),
  customFieldsGet: vi.fn().mockResolvedValue(undefined),
}));

// Mock config to avoid file system access
vi.mock('../../config.js', () => ({
  getConfig: vi.fn().mockReturnValue({
    apiToken: 'test-token',
    organizationId: 'test-org',
    baseUrl: 'https://api.productive.io/api/v2',
  }),
}));

// Mock cache with full interface
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

describe('custom-fields command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const handlers = await import('./handlers.js');
    vi.mocked(handlers.customFieldsList).mockClear();
    vi.mocked(handlers.customFieldsGet).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "list" subcommand to customFieldsList', async () => {
    const handlers = await import('./handlers.js');

    await handleCustomFieldsCommand('list', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.customFieldsList).toHaveBeenCalled();
  });

  it('should route "ls" alias to customFieldsList', async () => {
    const handlers = await import('./handlers.js');

    await handleCustomFieldsCommand('ls', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.customFieldsList).toHaveBeenCalled();
  });

  it('should route "get" subcommand to customFieldsGet', async () => {
    const handlers = await import('./handlers.js');

    await handleCustomFieldsCommand('get', ['42236'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.customFieldsGet).toHaveBeenCalledWith(['42236'], expect.anything());
  });

  it('should exit with error for unknown subcommand', async () => {
    await handleCustomFieldsCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown custom-fields subcommand: unknown'),
    );
  });
});
