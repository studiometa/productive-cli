/**
 * Get custom field executor.
 */

import type { ProductiveCustomField } from '@studiometa/productive-api';

import type { ExecutorContext } from '../../context/types.js';
import type { ExecutorResult } from '../types.js';
import type { GetCustomFieldOptions } from './types.js';

export async function getCustomField(
  options: GetCustomFieldOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<ProductiveCustomField>> {
  const response = await ctx.api.getCustomField(options.id, {
    include: options.include ?? ['options'],
  });

  return {
    data: response.data,
    included: response.included,
  };
}
