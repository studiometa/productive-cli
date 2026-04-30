import { describe, expect, it, vi } from 'vitest';

import type { HandlerContext } from './types.js';

import { handleApiRead } from './api-read.js';

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

describe('handleApiRead', () => {
  it('returns endpoint docs in describe mode', async () => {
    const result = await handleApiRead(
      { path: '/invoices', describe: true },
      createHandlerContext(vi.fn()),
    );
    expect(result.isError).toBeUndefined();
    expect((result.content[0] as { text: string }).text).toContain('/invoices');
    expect((result.content[0] as { text: string }).text).toContain('sent_status');
  });

  it('executes a validated GET request', async () => {
    const requestRaw = vi.fn().mockResolvedValue({ data: [{ id: '1' }] });
    const result = await handleApiRead(
      {
        path: '/api/v2/invoices',
        filter: { sent_status: { eq: 2 } },
        include: ['company'],
        sort: ['-sent_on'],
      },
      createHandlerContext(requestRaw),
    );

    expect(result.isError).toBeUndefined();
    expect(requestRaw).toHaveBeenCalledWith('/invoices', {
      method: 'GET',
      query: {
        'filter[sent_status][eq]': '2',
        include: 'company',
        sort: '-sent_on',
      },
    });
  });

  it('returns a helpful error for invalid filters', async () => {
    const result = await handleApiRead(
      { path: '/invoices', filter: { nope: 'x' } },
      createHandlerContext(vi.fn()),
    );

    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('Invalid filter field');
  });
});
