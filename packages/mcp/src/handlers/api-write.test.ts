import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HandlerContext } from './types.js';

import { handleApiWrite } from './api-write.js';

function createHandlerContext(requestRaw: ReturnType<typeof vi.fn>): HandlerContext {
  return {
    formatOptions: { compact: false },
    perPage: 20,
    includeHints: false,
    includeSuggestions: false,
    executor: () => ({
      api: { requestRaw } as never,
      resolver: {} as never,
      config: { organizationId: 'org' },
    }),
  };
}

describe('handleApiWrite', () => {
  afterEach(() => {
    delete process.env.PRODUCTIVE_MCP_ENABLE_API_WRITE;
  });

  it('is disabled by default', async () => {
    const result = await handleApiWrite(
      {
        method: 'PATCH',
        path: '/tasks/123',
        body: { data: { id: '123' } },
        confirm: true,
      },
      createHandlerContext(vi.fn()),
    );

    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('api_write is disabled');
  });

  it('requires confirm=true', async () => {
    process.env.PRODUCTIVE_MCP_ENABLE_API_WRITE = 'true';

    const result = await handleApiWrite(
      { method: 'PATCH', path: '/tasks/123', body: {} },
      createHandlerContext(vi.fn()),
    );

    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('confirm=true');
  });

  it('supports dry run without executing the request', async () => {
    process.env.PRODUCTIVE_MCP_ENABLE_API_WRITE = 'true';
    const requestRaw = vi.fn();

    const result = await handleApiWrite(
      {
        method: 'PATCH',
        path: '/api/v2/tasks/123',
        body: { data: { id: '123' } },
        confirm: true,
        dry_run: true,
      },
      createHandlerContext(requestRaw),
    );

    expect(result.isError).toBeUndefined();
    expect(requestRaw).not.toHaveBeenCalled();
    expect((result.content[0] as { text: string }).text).toContain('"dry_run": true');
    expect((result.content[0] as { text: string }).text).toContain('/tasks/123');
  });

  it('executes validated writes when enabled', async () => {
    process.env.PRODUCTIVE_MCP_ENABLE_API_WRITE = 'true';
    const requestRaw = vi.fn().mockResolvedValue({ data: { id: '123' } });

    const result = await handleApiWrite(
      {
        method: 'PATCH',
        path: '/tasks/123',
        body: { data: { id: '123' } },
        confirm: true,
      },
      createHandlerContext(requestRaw),
    );

    expect(result.isError).toBeUndefined();
    expect(requestRaw).toHaveBeenCalledWith('/tasks/123', {
      method: 'PATCH',
      query: undefined,
      body: { data: { id: '123' } },
    });
  });
});
