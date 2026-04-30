import { describe, expect, it, vi } from 'vitest';

import { createTestExecutorContext } from '../../context/test-utils.js';
import { DEFAULT_MAX_PAGES, readApi } from './index.js';

describe('readApi', () => {
  it('makes a raw GET request and returns the response payload', async () => {
    const payload = { data: [{ id: '1' }], meta: { current_page: 1 } };
    const requestRaw = vi.fn().mockResolvedValue(payload);
    const ctx = createTestExecutorContext({ api: { requestRaw } });

    const result = await readApi(
      {
        path: '/invoices',
        query: { 'filter[company_id]': 123, archived: false, include: 'company' },
      },
      ctx,
    );

    expect(requestRaw).toHaveBeenCalledWith('/invoices', {
      method: 'GET',
      query: { 'filter[company_id]': 123, archived: false, include: 'company' },
    });
    expect(result).toEqual({ data: payload });
  });

  it('fetches multiple pages when paginate is enabled', async () => {
    const requestRaw = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: '1' }],
        meta: { current_page: 1, total_pages: 2 },
        included: [{ id: '10', type: 'companies', attributes: { name: 'ACME' } }],
      })
      .mockResolvedValueOnce({
        data: [{ id: '2' }],
        meta: { current_page: 2, total_pages: 2 },
      });
    const ctx = createTestExecutorContext({ api: { requestRaw } });

    const result = await readApi({ path: '/invoices', paginate: true }, ctx);

    expect(requestRaw).toHaveBeenNthCalledWith(1, '/invoices', {
      method: 'GET',
      query: { 'page[number]': 1 },
    });
    expect(requestRaw).toHaveBeenNthCalledWith(2, '/invoices', {
      method: 'GET',
      query: { 'page[number]': 2 },
    });
    expect(result).toEqual({
      data: [{ id: '1' }, { id: '2' }],
      meta: { current_page: 2, total_pages: 2, pagesFetched: 2, truncated: false },
      included: [{ id: '10', type: 'companies', attributes: { name: 'ACME' } }],
    });
  });

  it('caps pagination to the default max page count', async () => {
    const requestRaw = vi.fn().mockResolvedValue({
      data: [{ id: '1' }],
      meta: { current_page: 1, total_pages: DEFAULT_MAX_PAGES + 1 },
    });
    const ctx = createTestExecutorContext({ api: { requestRaw } });

    const result = await readApi({ path: '/invoices', paginate: true }, ctx);

    expect(requestRaw).toHaveBeenCalledTimes(DEFAULT_MAX_PAGES);
    expect(result.meta).toEqual({
      current_page: 1,
      total_pages: DEFAULT_MAX_PAGES + 1,
      pagesFetched: DEFAULT_MAX_PAGES,
      truncated: true,
    });
  });
});
