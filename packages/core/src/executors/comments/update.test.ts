import { describe, expect, it, vi } from 'vitest';

import { createTestExecutorContext } from '../../context/test-utils.js';
import { ExecutorValidationError } from '../errors.js';
import { updateComment } from './update.js';

describe('updateComment', () => {
  const mockComment = {
    id: '1',
    type: 'comments' as const,
    attributes: { body: 'Updated comment' },
  };

  it('updates comment body', async () => {
    const updateCommentApi = vi.fn().mockResolvedValue({ data: mockComment });
    const ctx = createTestExecutorContext({
      api: { updateComment: updateCommentApi },
    });

    const result = await updateComment({ id: '1', body: 'Updated comment' }, ctx);

    expect(updateCommentApi).toHaveBeenCalledWith('1', { body: 'Updated comment' });
    expect(result.data).toEqual(mockComment);
  });

  it('should throw ExecutorValidationError when no updates provided', async () => {
    const ctx = createTestExecutorContext();

    await expect(updateComment({ id: '1' }, ctx)).rejects.toThrow(ExecutorValidationError);
    await expect(updateComment({ id: '1' }, ctx)).rejects.toThrow(
      'No updates specified. Provide at least one of: body',
    );
  });
});
