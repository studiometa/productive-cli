import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeToolWithCredentials } from '../handlers.js';
import type { ProductiveCredentials } from '../auth.js';

// Mock the ProductiveApi
vi.mock('@studiometa/productive-cli', () => {
  const mockApi = {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    getTimeEntries: vi.fn(),
    getTimeEntry: vi.fn(),
    createTimeEntry: vi.fn(),
    updateTimeEntry: vi.fn(),
    deleteTimeEntry: vi.fn(),
    getTasks: vi.fn(),
    getTask: vi.fn(),
    getServices: vi.fn(),
    getPeople: vi.fn(),
    getPerson: vi.fn(),
  };

  return {
    ProductiveApi: vi.fn(() => mockApi),
    // Re-export formatter functions as pass-through
    formatTimeEntry: vi.fn((entry) => ({ id: entry.id, ...entry.attributes })),
    formatProject: vi.fn((project) => ({ id: project.id, ...project.attributes })),
    formatTask: vi.fn((task) => ({ id: task.id, ...task.attributes })),
    formatPerson: vi.fn((person) => ({ id: person.id, ...person.attributes })),
    formatService: vi.fn((service) => ({ id: service.id, ...service.attributes })),
    formatListResponse: vi.fn((data, formatter, meta) => ({
      data: data.map((item: Record<string, unknown>) => formatter(item)),
      meta,
    })),
  };
});

// Import mocked module to access mock functions
import { ProductiveApi } from '@studiometa/productive-cli';

describe('handlers', () => {
  const credentials: ProductiveCredentials = {
    apiToken: 'test-token',
    organizationId: 'test-org',
    userId: 'test-user',
  };

  let mockApi: ReturnType<typeof ProductiveApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = new ProductiveApi({}) as ReturnType<typeof ProductiveApi>;
  });

  describe('executeToolWithCredentials', () => {
    describe('consolidated productive_projects tool', () => {
      it('should handle list action', async () => {
        const mockResponse = {
          data: [
            { id: '1', type: 'projects', attributes: { name: 'Project 1' } },
            { id: '2', type: 'projects', attributes: { name: 'Project 2' } },
          ],
          meta: { current_page: 1, total_pages: 1 },
        };
        mockApi.getProjects.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_projects',
          { action: 'list', page: 1 },
          credentials
        );

        expect(result.isError).toBeUndefined();
        expect(result.content[0].type).toBe('text');
        expect(mockApi.getProjects).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1, perPage: 20 })
        );
      });

      it('should handle get action', async () => {
        const mockResponse = {
          data: { id: '123', type: 'projects', attributes: { name: 'Test Project' } },
        };
        mockApi.getProject.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_projects',
          { action: 'get', id: '123' },
          credentials
        );

        expect(result.isError).toBeUndefined();
        expect(mockApi.getProject).toHaveBeenCalledWith('123');
      });

      it('should return error for get action without id', async () => {
        const result = await executeToolWithCredentials(
          'productive_projects',
          { action: 'get' },
          credentials
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('id is required');
      });
    });

    describe('consolidated productive_time tool', () => {
      it('should handle list action', async () => {
        const mockResponse = {
          data: [
            { id: '1', type: 'time_entries', attributes: { date: '2024-01-15', time: 480 } },
          ],
          meta: { current_page: 1, total_pages: 1 },
        };
        mockApi.getTimeEntries.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_time',
          { action: 'list', filter: { person_id: '123' } },
          credentials
        );

        expect(result.isError).toBeUndefined();
        expect(mockApi.getTimeEntries).toHaveBeenCalledWith(
          expect.objectContaining({ filter: { person_id: '123' } })
        );
      });

      it('should handle get action', async () => {
        const mockResponse = {
          data: { id: '456', type: 'time_entries', attributes: { date: '2024-01-15', time: 480 } },
        };
        mockApi.getTimeEntry.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_time',
          { action: 'get', id: '456' },
          credentials
        );

        expect(result.isError).toBeUndefined();
        expect(mockApi.getTimeEntry).toHaveBeenCalledWith('456');
      });

      it('should handle create action', async () => {
        const mockResponse = {
          data: { id: '789', type: 'time_entries', attributes: { date: '2024-01-15', time: 480 } },
        };
        mockApi.createTimeEntry.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_time',
          {
            action: 'create',
            person_id: '123',
            service_id: '456',
            time: 480,
            date: '2024-01-15',
            note: 'Test entry',
          },
          credentials
        );

        expect(result.isError).toBeUndefined();
        const content = JSON.parse(result.content[0].text as string);
        expect(content.success).toBe(true);
        expect(mockApi.createTimeEntry).toHaveBeenCalled();
      });

      it('should return error for create action missing required fields', async () => {
        const result = await executeToolWithCredentials(
          'productive_time',
          { action: 'create', person_id: '123' }, // missing service_id, time, date
          credentials
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('required for create');
      });

      it('should handle update action', async () => {
        const mockResponse = {
          data: { id: '789', type: 'time_entries', attributes: { date: '2024-01-15', time: 240 } },
        };
        mockApi.updateTimeEntry.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_time',
          { action: 'update', id: '789', time: 240 },
          credentials
        );

        expect(result.isError).toBeUndefined();
        const content = JSON.parse(result.content[0].text as string);
        expect(content.success).toBe(true);
        expect(mockApi.updateTimeEntry).toHaveBeenCalledWith('789', { time: 240 });
      });

      it('should handle delete action', async () => {
        mockApi.deleteTimeEntry.mockResolvedValue(undefined);

        const result = await executeToolWithCredentials(
          'productive_time',
          { action: 'delete', id: '789' },
          credentials
        );

        expect(result.isError).toBeUndefined();
        const content = JSON.parse(result.content[0].text as string);
        expect(content.success).toBe(true);
        expect(content.message).toBe('Time entry deleted');
        expect(mockApi.deleteTimeEntry).toHaveBeenCalledWith('789');
      });
    });

    describe('consolidated productive_tasks tool', () => {
      it('should handle list action', async () => {
        const mockResponse = {
          data: [
            { id: '1', type: 'tasks', attributes: { title: 'Task 1' } },
          ],
          meta: { current_page: 1, total_pages: 1 },
          included: [],
        };
        mockApi.getTasks.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_tasks',
          { action: 'list', filter: { project_id: '123' } },
          credentials
        );

        expect(result.isError).toBeUndefined();
        // Verify include is added for context
        expect(mockApi.getTasks).toHaveBeenCalledWith(
          expect.objectContaining({
            include: ['project', 'project.company'],
          })
        );
      });

      it('should handle get action', async () => {
        const mockResponse = {
          data: { id: '456', type: 'tasks', attributes: { title: 'Test Task' } },
          included: [],
        };
        mockApi.getTask.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_tasks',
          { action: 'get', id: '456' },
          credentials
        );

        expect(result.isError).toBeUndefined();
        expect(mockApi.getTask).toHaveBeenCalledWith('456', {
          include: ['project', 'project.company'],
        });
      });
    });

    describe('consolidated productive_people tool', () => {
      it('should handle list action', async () => {
        const mockResponse = {
          data: [
            { id: '1', type: 'people', attributes: { first_name: 'John', last_name: 'Doe' } },
          ],
          meta: { current_page: 1, total_pages: 1 },
        };
        mockApi.getPeople.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_people',
          { action: 'list' },
          credentials
        );

        expect(result.isError).toBeUndefined();
        expect(mockApi.getPeople).toHaveBeenCalled();
      });

      it('should handle get action', async () => {
        const mockResponse = {
          data: { id: '123', type: 'people', attributes: { first_name: 'John', last_name: 'Doe' } },
        };
        mockApi.getPerson.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_people',
          { action: 'get', id: '123' },
          credentials
        );

        expect(result.isError).toBeUndefined();
        expect(mockApi.getPerson).toHaveBeenCalledWith('123');
      });

      it('should handle me action with userId', async () => {
        const mockResponse = {
          data: { id: 'test-user', type: 'people', attributes: { first_name: 'Test', last_name: 'User' } },
        };
        mockApi.getPerson.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_people',
          { action: 'me' },
          credentials
        );

        expect(result.isError).toBeUndefined();
        expect(mockApi.getPerson).toHaveBeenCalledWith('test-user');
      });

      it('should handle me action without userId', async () => {
        const credentialsWithoutUser: ProductiveCredentials = {
          apiToken: 'test-token',
          organizationId: 'test-org',
        };

        const result = await executeToolWithCredentials(
          'productive_people',
          { action: 'me' },
          credentialsWithoutUser
        );

        expect(result.isError).toBeUndefined();
        const content = JSON.parse(result.content[0].text as string);
        expect(content.message).toContain('User ID not configured');
      });
    });

    describe('consolidated productive_services tool', () => {
      it('should handle list action', async () => {
        const mockResponse = {
          data: [
            { id: '1', type: 'services', attributes: { name: 'Development' } },
          ],
          meta: { current_page: 1, total_pages: 1 },
        };
        mockApi.getServices.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_services',
          { action: 'list', filter: { project_id: '123' } },
          credentials
        );

        expect(result.isError).toBeUndefined();
        expect(mockApi.getServices).toHaveBeenCalledWith(
          expect.objectContaining({ filter: { project_id: '123' } })
        );
      });
    });

    describe('compact mode', () => {
      it('should pass compact option to formatters', async () => {
        const mockResponse = {
          data: [{ id: '1', type: 'projects', attributes: { name: 'Project 1' } }],
          meta: { current_page: 1, total_pages: 1 },
        };
        mockApi.getProjects.mockResolvedValue(mockResponse);

        const result = await executeToolWithCredentials(
          'productive_projects',
          { action: 'list', compact: true },
          credentials
        );

        expect(result.isError).toBeUndefined();
        // The compact option is passed to formatters, which are mocked
        // Just verify the call succeeded
        expect(mockApi.getProjects).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should return error for unknown tool', async () => {
        const result = await executeToolWithCredentials(
          'unknown_tool',
          {},
          credentials
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unknown tool');
      });

      it('should handle API errors gracefully', async () => {
        mockApi.getProjects.mockRejectedValue(new Error('API request failed: 401 Unauthorized'));

        const result = await executeToolWithCredentials(
          'productive_projects',
          { action: 'list' },
          credentials
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('401 Unauthorized');
      });

      it('should handle non-Error exceptions', async () => {
        mockApi.getProjects.mockRejectedValue('String error');

        const result = await executeToolWithCredentials(
          'productive_projects',
          { action: 'list' },
          credentials
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('String error');
      });
    });
  });
});
