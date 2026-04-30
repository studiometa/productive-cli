import type { ExecutorContext } from '../../context/types.js';
import type { ExecutorResult } from '../types.js';
import type { ApiReadOptions } from './types.js';

export async function apiRead(
  options: ApiReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<unknown>> {
  const data = await ctx.api.requestRaw(options.path, {
    method: 'GET',
    query: options.query,
  });

  return { data };
}
