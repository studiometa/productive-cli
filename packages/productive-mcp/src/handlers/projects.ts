/**
 * Projects MCP handler.
 */

import { fromHandlerContext, listProjects, getProject } from '@studiometa/productive-core';

import type { CommonArgs, HandlerContext, ToolResult } from './types.js';

import { ErrorMessages } from '../errors.js';
import { formatListResponse, formatProject } from '../formatters.js';
import { getProjectHints } from '../hints.js';
import {
  resolveFilters,
  resolveFilterValue,
  handleResolve,
  isNumericId,
  type ResolvableResourceType,
} from './resolve.js';
import { inputErrorResult, jsonResult } from './utils.js';

const resolveFns = { resolveFilterValue, resolveFilters, isNumericId };

const VALID_ACTIONS = ['list', 'get', 'resolve'];

export async function handleProjects(
  action: string,
  args: CommonArgs & { query?: string; type?: ResolvableResourceType },
  ctx: HandlerContext,
): Promise<ToolResult> {
  const { formatOptions, filter, page, perPage } = ctx;
  const { id, query, type } = args;

  if (action === 'resolve') {
    return handleResolve({ query, type }, ctx);
  }

  const execCtx = fromHandlerContext(ctx, resolveFns);

  if (action === 'get') {
    if (!id) return inputErrorResult(ErrorMessages.missingId('get'));

    const result = await getProject({ id }, execCtx);
    const formatted = formatProject(result.data, formatOptions);

    if (ctx.includeHints !== false) {
      return jsonResult({
        ...formatted,
        _hints: getProjectHints(id),
      });
    }

    return jsonResult(formatted);
  }

  if (action === 'list') {
    const result = await listProjects({ page, perPage, additionalFilters: filter }, execCtx);

    const response = formatListResponse(result.data, formatProject, result.meta, formatOptions);

    if (result.resolved && Object.keys(result.resolved).length > 0) {
      return jsonResult({ ...response, _resolved: result.resolved });
    }

    return jsonResult(response);
  }

  return inputErrorResult(ErrorMessages.invalidAction(action, 'projects', VALID_ACTIONS));
}
