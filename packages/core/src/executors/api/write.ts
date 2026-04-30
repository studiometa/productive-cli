import type { ExecutorContext } from '../../context/types.js';
import type { ExecutorResult } from '../types.js';
import type { ApiWriteOptions } from './types.js';

export async function apiWrite(
  options: ApiWriteOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<unknown>> {
  const data = await ctx.api.requestRaw(options.path, {
    method: options.method,
    body: options.body,
    query: options.query,
  });

  return { data };
}
