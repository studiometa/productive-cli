import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleBookingsCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  bookingsList: vi.fn().mockResolvedValue(undefined),
  bookingsGet: vi.fn().mockResolvedValue(undefined),
  bookingsAdd: vi.fn().mockResolvedValue(undefined),
  bookingsUpdate: vi.fn().mockResolvedValue(undefined),
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

describe('bookings command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.bookingsList).mockClear();
    vi.mocked(handlers.bookingsGet).mockClear();
    vi.mocked(handlers.bookingsAdd).mockClear();
    vi.mocked(handlers.bookingsUpdate).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "list" subcommand to bookingsList', async () => {
    const handlers = await import('./handlers.js');

    await handleBookingsCommand('list', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.bookingsList).toHaveBeenCalled();
  });

  it('should route "ls" alias to bookingsList', async () => {
    const handlers = await import('./handlers.js');

    await handleBookingsCommand('ls', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.bookingsList).toHaveBeenCalled();
  });

  it('should route "get" subcommand to bookingsGet', async () => {
    const handlers = await import('./handlers.js');

    await handleBookingsCommand('get', ['123'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.bookingsGet).toHaveBeenCalledWith(['123'], expect.anything());
  });

  it('should route "add" subcommand to bookingsAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleBookingsCommand('add', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.bookingsAdd).toHaveBeenCalled();
  });

  it('should route "create" alias to bookingsAdd', async () => {
    const handlers = await import('./handlers.js');

    await handleBookingsCommand('create', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.bookingsAdd).toHaveBeenCalled();
  });

  it('should route "update" subcommand to bookingsUpdate', async () => {
    const handlers = await import('./handlers.js');

    await handleBookingsCommand('update', ['456'], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.bookingsUpdate).toHaveBeenCalledWith(['456'], expect.anything());
  });

  it('should exit with error for unknown subcommand', async () => {
    await handleBookingsCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown bookings subcommand: unknown'),
    );
  });
});
