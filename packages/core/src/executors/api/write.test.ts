import { describe, expect, it, vi } from 'vitest';

import { createTestExecutorContext } from '../../context/test-utils.js';
import { apiWrite } from './write.js';

describe('apiWrite', () => {
  it('makes a raw write request and returns the response payload', async () => {
    const payload = { data: { id: '123', type: 'tasks' } };
    const requestRaw = vi.fn().mockResolvedValue(payload);
    const ctx = createTestExecutorContext({ api: { requestRaw } });

    const result = await apiWrite(
      {
        path: '/tasks/123',
        method: 'PATCH',
        body: {
          data: {
            id: '123',
            type: 'tasks',
            attributes: { title: 'Updated title' },
          },
        },
        query: { notify: true },
      },
      ctx,
    );

    expect(requestRaw).toHaveBeenCalledWith('/tasks/123', {
      method: 'PATCH',
      body: {
        data: {
          id: '123',
          type: 'tasks',
          attributes: { title: 'Updated title' },
        },
      },
      query: { notify: true },
    });
    expect(result).toEqual({ data: payload });
  });
});
