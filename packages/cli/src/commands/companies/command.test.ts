import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleCompaniesCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  companiesList: vi.fn().mockResolvedValue(undefined),
  companiesGet: vi.fn().mockResolvedValue(undefined),
  companiesAdd: vi.fn().mockResolvedValue(undefined),
  companiesUpdate: vi.fn().mockResolvedValue(undefined),
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

describe('companies command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.companiesList).mockClear();
    vi.mocked(handlers.companiesGet).mockClear();
    vi.mocked(handlers.companiesAdd).mockClear();
    vi.mocked(handlers.companiesUpdate).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "list" subcommand to companiesList', async () => {
    const handlers = await import('./handlers.js');

    await handleCompaniesCommand('list', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.companiesList).toHaveBeenCalled();
  });

  it('should route "ls" alias to companiesList', async () => {
    const handlers = await import('./handlers.js');

    await handleCompaniesCommand('ls', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.companiesList).toHaveBeenCalled();
  });

  it('should route "get" subcommand to companiesGet', async () => {
    const handlers = await import('./handlers.js');

    await handleCompaniesCommand('get', ['123'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.companiesGet).toHaveBeenCalledWith(['123'], expect.anything());
  });

  it('should route "add" subcommand to companiesAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleCompaniesCommand('add', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.companiesAdd).toHaveBeenCalled();
  });

  it('should route "create" alias to companiesAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleCompaniesCommand('create', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.companiesAdd).toHaveBeenCalled();
  });

  it('should route "update" subcommand to companiesUpdate', async () => {
    const handlers = await import('./handlers.js');

    await handleCompaniesCommand('update', ['456'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.companiesUpdate).toHaveBeenCalledWith(['456'], expect.anything());
  });

  it('should exit with error for unknown subcommand', async () => {
    await handleCompaniesCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown companies subcommand: unknown'),
    );
  });
});
