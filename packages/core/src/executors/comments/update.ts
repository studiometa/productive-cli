import type { ProductiveComment } from '@studiometa/productive-api';

import type { ExecutorContext } from '../../context/types.js';
import type { ExecutorResult } from '../types.js';
import type { UpdateCommentOptions } from './types.js';

import { ExecutorValidationError } from '../errors.js';

export async function updateComment(
  options: UpdateCommentOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<ProductiveComment>> {
  const data: Record<string, string | boolean | undefined> = {};
  if (options.body !== undefined) data.body = options.body;
  if (options.hidden !== undefined) data.hidden = options.hidden;

  if (Object.keys(data).length === 0) {
    throw new ExecutorValidationError(
      'No updates specified. Provide at least one of: body, hidden',
      'options',
    );
  }

  const response = await ctx.api.updateComment(options.id, data);
  return { data: response.data };
}
