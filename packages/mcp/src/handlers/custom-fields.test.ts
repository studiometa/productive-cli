/**
 * Tests for the custom_fields MCP handler.
 */

import type { JsonApiResource } from '@studiometa/productive-api';
import type { ExecutorContext } from '@studiometa/productive-core';

import { describe, it, expect, vi } from 'vitest';

import type { HandlerContext } from './types.js';

import { handleCustomFields } from './custom-fields.js';

const mockCustomFields: JsonApiResource[] = [
  {
    id: '42236',
    type: 'custom_fields',
    attributes: {
      name: 'Semaine',
      data_type_id: 3,
      customizable_type: 'Task',
      archived: false,
      required: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
    },
  },
  {
    id: '41487',
    type: 'custom_fields',
    attributes: {
      name: 'Points',
      data_type_id: 2,
      customizable_type: 'Task',
      archived: false,
      required: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
    },
  },
];

const mockSingleField: JsonApiResource = {
  id: '42236',
  type: 'custom_fields',
  attributes: {
    name: 'Semaine',
    data_type_id: 3,
    customizable_type: 'Task',
    archived: false,
    required: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
};

const createMockExecutorContext = (
  overrides: Partial<ExecutorContext['api']> = {},
): ExecutorContext =>
  ({
    api: overrides as ExecutorContext['api'],
    resolver: {
      resolveValue: vi.fn(),
      resolveFilters: vi.fn().mockResolvedValue({ resolved: {}, metadata: {} }),
    },
    config: { organizationId: 'test-org' },
  }) as unknown as ExecutorContext;

const createMockHandlerContext = (overrides?: Partial<HandlerContext>): HandlerContext => ({
  formatOptions: {},
  perPage: 20,
  executor: () => createMockExecutorContext(),
  ...overrides,
});

describe('handleCustomFields', () => {
  describe('list action', () => {
    it('returns formatted custom field list', async () => {
      const getCustomFields = vi.fn().mockResolvedValue({
        data: mockCustomFields,
        meta: { current_page: 1, total_pages: 1, total_count: 2 },
      });
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext({ getCustomFields }),
      });

      const result = await handleCustomFields('list', {}, ctx);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(content.data).toHaveLength(2);
      expect(content.data[0].name).toBe('Semaine');
      expect(content.data[0].data_type).toBe('select');
      expect(content.data[1].name).toBe('Points');
      expect(content.data[1].data_type).toBe('number');
    });

    it('passes customizable_type filter from args', async () => {
      const getCustomFields = vi.fn().mockResolvedValue({ data: [], meta: {} });
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext({ getCustomFields }),
      });

      await handleCustomFields(
        'list',
        { customizable_type: 'Task' } as Record<string, unknown>,
        ctx,
      );

      const callArgs = getCustomFields.mock.calls[0][0];
      expect(callArgs.filter?.customizable_type).toBe('Task');
    });

    it('passes archived filter from args', async () => {
      const getCustomFields = vi.fn().mockResolvedValue({ data: [], meta: {} });
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext({ getCustomFields }),
      });

      await handleCustomFields('list', { archived: 'false' } as Record<string, unknown>, ctx);

      const callArgs = getCustomFields.mock.calls[0][0];
      expect(callArgs.filter?.archived).toBe('false');
    });

    it('uses pagination from context', async () => {
      const getCustomFields = vi.fn().mockResolvedValue({ data: [], meta: {} });
      const ctx = createMockHandlerContext({
        page: 3,
        perPage: 10,
        executor: () => createMockExecutorContext({ getCustomFields }),
      });

      await handleCustomFields('list', {}, ctx);

      const callArgs = getCustomFields.mock.calls[0][0];
      expect(callArgs.page).toBe(3);
      expect(callArgs.perPage).toBe(10);
    });
  });

  describe('get action', () => {
    it('returns formatted custom field with options', async () => {
      const getCustomField = vi.fn().mockResolvedValue({
        data: mockSingleField,
        included: [
          {
            id: '417421',
            type: 'custom_field_options',
            attributes: { value: '2026-09', archived: false },
            relationships: {
              custom_field: { data: { type: 'custom_fields', id: '42236' } },
            },
          },
        ],
      });
      const ctx = createMockHandlerContext({
        includeHints: true,
        executor: () => createMockExecutorContext({ getCustomField }),
      });

      const result = await handleCustomFields(
        'get',
        { id: '42236' } as Record<string, unknown>,
        ctx,
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(content.name).toBe('Semaine');
      expect(content.data_type).toBe('select');
    });

    it('returns error when id is missing', async () => {
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext(),
      });

      const result = await handleCustomFields('get', {}, ctx);
      expect(result.isError).toBe(true);
    });

    it('includes options in default include', async () => {
      const getCustomField = vi.fn().mockResolvedValue({
        data: mockSingleField,
        included: [],
      });
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext({ getCustomField }),
      });

      await handleCustomFields('get', { id: '42236' } as Record<string, unknown>, ctx);

      // The core executor calls ctx.api.getCustomField(id, { include })
      expect(getCustomField).toHaveBeenCalledWith('42236', { include: ['options'] });
    });
  });

  describe('unsupported actions', () => {
    it('returns error for create action', async () => {
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext(),
      });

      const result = await handleCustomFields('create', {}, ctx);
      expect(result.isError).toBe(true);
    });

    it('returns error for update action', async () => {
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext(),
      });

      const result = await handleCustomFields('update', { id: '1' }, ctx);
      expect(result.isError).toBe(true);
    });

    it('returns error for delete action', async () => {
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext(),
      });

      const result = await handleCustomFields('delete', { id: '1' }, ctx);
      expect(result.isError).toBe(true);
    });
  });
});
