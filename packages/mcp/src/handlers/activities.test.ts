/**
 * Tests for the activities MCP handler.
 */

import type { JsonApiResource } from '@studiometa/productive-api';
import type { ExecutorContext } from '@studiometa/productive-core';

import { describe, it, expect, vi } from 'vitest';

import type { HandlerContext } from './types.js';

import { handleActivities } from './activities.js';

const mockActivities: JsonApiResource[] = [
  {
    id: '1',
    type: 'activities',
    attributes: {
      event: 'create',
      changeset: [{ name: [null, 'New Project'] }],
      created_at: '2026-02-22T10:00:00Z',
    },
    relationships: {
      creator: { data: { type: 'people', id: '42' } },
    },
  },
  {
    id: '2',
    type: 'activities',
    attributes: {
      event: 'update',
      changeset: [{ status: ['open', 'closed'] }],
      created_at: '2026-02-22T11:00:00Z',
    },
    relationships: {
      creator: { data: { type: 'people', id: '42' } },
    },
  },
];

const createMockExecutorContext = (
  overrides: Partial<ExecutorContext['api']> = {},
): ExecutorContext => ({
  api: overrides as ExecutorContext['api'],
  resolver: {
    resolveValue: vi.fn(),
    resolveFilters: vi.fn().mockResolvedValue({ resolved: {}, metadata: {} }),
  },
  config: { organizationId: 'test-org' },
});

const createMockHandlerContext = (overrides?: Partial<HandlerContext>): HandlerContext => ({
  formatOptions: {},
  perPage: 20,
  executor: () => createMockExecutorContext(),
  ...overrides,
});

describe('handleActivities', () => {
  describe('list action', () => {
    it('returns formatted activity list', async () => {
      const getActivities = vi.fn().mockResolvedValue({
        data: mockActivities,
        meta: { current_page: 1, total_pages: 1, total_count: 2 },
      });
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext({ getActivities }),
      });

      const result = await handleActivities('list', {}, ctx);

      expect(result.isError).toBeUndefined();
      const content = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(content.data).toHaveLength(2);
      expect(content.data[0].event).toBe('create');
      expect(content.data[1].event).toBe('update');
    });

    it('passes event filter from args', async () => {
      const getActivities = vi.fn().mockResolvedValue({ data: [], meta: {} });
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext({ getActivities }),
      });

      await handleActivities('list', { event: 'create' } as Record<string, unknown>, ctx);

      // The executor receives additionalFilters with event=create
      const callArgs = getActivities.mock.calls[0][0];
      expect(callArgs.filter?.event).toBe('create');
    });

    it('passes after filter from args', async () => {
      const getActivities = vi.fn().mockResolvedValue({ data: [], meta: {} });
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext({ getActivities }),
      });

      await handleActivities(
        'list',
        { after: '2026-01-01T00:00:00Z' } as Record<string, unknown>,
        ctx,
      );

      const callArgs = getActivities.mock.calls[0][0];
      expect(callArgs.filter?.after).toBe('2026-01-01T00:00:00Z');
    });

    it('includes creator by default', async () => {
      const getActivities = vi.fn().mockResolvedValue({ data: [], meta: {} });
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext({ getActivities }),
      });

      await handleActivities('list', {}, ctx);

      const callArgs = getActivities.mock.calls[0][0];
      expect(callArgs.include).toContain('creator');
    });

    it('merges user-provided includes with default creator', async () => {
      const getActivities = vi.fn().mockResolvedValue({ data: [], meta: {} });
      const ctx = createMockHandlerContext({
        include: ['creator'],
        executor: () => createMockExecutorContext({ getActivities }),
      });

      await handleActivities('list', {}, ctx);

      const callArgs = getActivities.mock.calls[0][0];
      expect(callArgs.include).toContain('creator');
    });

    it('uses pagination from context', async () => {
      const getActivities = vi.fn().mockResolvedValue({ data: [], meta: {} });
      const ctx = createMockHandlerContext({
        page: 3,
        perPage: 10,
        executor: () => createMockExecutorContext({ getActivities }),
      });

      await handleActivities('list', {}, ctx);

      const callArgs = getActivities.mock.calls[0][0];
      expect(callArgs.page).toBe(3);
      expect(callArgs.perPage).toBe(10);
    });
  });

  describe('unsupported actions', () => {
    it('returns error for get action', async () => {
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext(),
      });

      const result = await handleActivities('get', { id: '1' }, ctx);
      expect(result.isError).toBe(true);
    });

    it('returns error for create action', async () => {
      const ctx = createMockHandlerContext({
        executor: () => createMockExecutorContext(),
      });

      const result = await handleActivities('create', {}, ctx);
      expect(result.isError).toBe(true);
    });
  });
});
