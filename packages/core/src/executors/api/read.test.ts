import { describe, expect, it, vi } from 'vitest';

import { createTestExecutorContext } from '../../context/test-utils.js';
import { apiRead } from './read.js';

describe('apiRead', () => {
  it('makes a raw GET request and returns the response payload', async () => {
    const payload = { data: [{ id: '1' }], meta: { current_page: 1 } };
    const requestRaw = vi.fn().mockResolvedValue(payload);
    const ctx = createTestExecutorContext({ api: { requestRaw } });

    const result = await apiRead(
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
});
