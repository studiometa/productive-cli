/**
 * People resource handler
 */

import type { ProductiveCredentials } from '../auth.js';
import type { CommonArgs, HandlerContext, ToolResult } from './types.js';

import { ErrorMessages } from '../errors.js';
import { formatListResponse, formatPerson } from '../formatters.js';
import { inputErrorResult, jsonResult } from './utils.js';

const VALID_ACTIONS = ['list', 'get', 'me'];

export async function handlePeople(
  action: string,
  args: CommonArgs,
  ctx: HandlerContext,
  credentials: ProductiveCredentials,
): Promise<ToolResult> {
  const { api, formatOptions, filter, page, perPage } = ctx;
  const { id } = args;

  if (action === 'get') {
    if (!id) return inputErrorResult(ErrorMessages.missingId('get'));
    const result = await api.getPerson(id);
    return jsonResult(formatPerson(result.data, formatOptions));
  }

  if (action === 'me') {
    if (credentials.userId) {
      const result = await api.getPerson(credentials.userId);
      return jsonResult(formatPerson(result.data, formatOptions));
    }
    return jsonResult({
      message: 'User ID not configured. Set userId in credentials to use this action.',
      hint: 'Use action="list" to find people, or configure the user ID in your credentials.',
      organizationId: credentials.organizationId,
    });
  }

  if (action === 'list') {
    const result = await api.getPeople({ filter, page, perPage });
    return jsonResult(formatListResponse(result.data, formatPerson, result.meta, formatOptions));
  }

  return inputErrorResult(ErrorMessages.invalidAction(action, 'people', VALID_ACTIONS));
}
