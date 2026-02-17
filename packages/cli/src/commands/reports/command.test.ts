import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleReportsCommand } from './command.js';

// Mock the handlers to avoid needing real API
vi.mock('./handlers.js', () => ({
  reportsTime: vi.fn().mockResolvedValue(undefined),
  reportsProject: vi.fn().mockResolvedValue(undefined),
  reportsBudget: vi.fn().mockResolvedValue(undefined),
  reportsPerson: vi.fn().mockResolvedValue(undefined),
  reportsInvoice: vi.fn().mockResolvedValue(undefined),
  reportsPayment: vi.fn().mockResolvedValue(undefined),
  reportsService: vi.fn().mockResolvedValue(undefined),
  reportsTask: vi.fn().mockResolvedValue(undefined),
  reportsCompany: vi.fn().mockResolvedValue(undefined),
  reportsDeal: vi.fn().mockResolvedValue(undefined),
  reportsTimesheet: vi.fn().mockResolvedValue(undefined),
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

describe('reports command routing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Reset mocks before each test
    const handlers = await import('./handlers.js');
    vi.mocked(handlers.reportsTime).mockClear();
    vi.mocked(handlers.reportsProject).mockClear();
    vi.mocked(handlers.reportsBudget).mockClear();
    vi.mocked(handlers.reportsPerson).mockClear();
    vi.mocked(handlers.reportsInvoice).mockClear();
    vi.mocked(handlers.reportsPayment).mockClear();
    vi.mocked(handlers.reportsService).mockClear();
    vi.mocked(handlers.reportsTask).mockClear();
    vi.mocked(handlers.reportsCompany).mockClear();
    vi.mocked(handlers.reportsDeal).mockClear();
    vi.mocked(handlers.reportsTimesheet).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should route "time" subcommand to reportsTime', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('time', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsTime).toHaveBeenCalled();
  });

  it('should route "project" subcommand to reportsProject', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('project', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsProject).toHaveBeenCalled();
  });

  it('should route "projects" alias to reportsProject', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('projects', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsProject).toHaveBeenCalled();
  });

  it('should route "budget" subcommand to reportsBudget', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('budget', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsBudget).toHaveBeenCalled();
  });

  it('should route "budgets" alias to reportsBudget', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('budgets', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsBudget).toHaveBeenCalled();
  });

  it('should route "person" subcommand to reportsPerson', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('person', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsPerson).toHaveBeenCalled();
  });

  it('should route "people" alias to reportsPerson', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('people', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsPerson).toHaveBeenCalled();
  });

  it('should route "invoice" subcommand to reportsInvoice', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('invoice', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsInvoice).toHaveBeenCalled();
  });

  it('should route "invoices" alias to reportsInvoice', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('invoices', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsInvoice).toHaveBeenCalled();
  });

  it('should route "payment" subcommand to reportsPayment', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('payment', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsPayment).toHaveBeenCalled();
  });

  it('should route "payments" alias to reportsPayment', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('payments', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsPayment).toHaveBeenCalled();
  });

  it('should route "service" subcommand to reportsService', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('service', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsService).toHaveBeenCalled();
  });

  it('should route "services" alias to reportsService', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('services', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsService).toHaveBeenCalled();
  });

  it('should route "task" subcommand to reportsTask', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('task', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsTask).toHaveBeenCalled();
  });

  it('should route "tasks" alias to reportsTask', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('tasks', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsTask).toHaveBeenCalled();
  });

  it('should route "company" subcommand to reportsCompany', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('company', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsCompany).toHaveBeenCalled();
  });

  it('should route "companies" alias to reportsCompany', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('companies', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsCompany).toHaveBeenCalled();
  });

  it('should route "deal" subcommand to reportsDeal', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('deal', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsDeal).toHaveBeenCalled();
  });

  it('should route "deals" alias to reportsDeal', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('deals', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsDeal).toHaveBeenCalled();
  });

  it('should route "timesheet" subcommand to reportsTimesheet', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('timesheet', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsTimesheet).toHaveBeenCalled();
  });

  it('should route "timesheets" alias to reportsTimesheet', async () => {
    const handlers = await import('./handlers.js');

    await handleReportsCommand('timesheets', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(handlers.reportsTimesheet).toHaveBeenCalled();
  });

  it('should exit with error for unknown subcommand', async () => {
    await handleReportsCommand('unknown', [], {
      format: 'json',
      token: 'test-token',
      'org-id': 'test-org',
    });

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown reports subcommand: unknown'),
    );
  });
});
