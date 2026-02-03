/**
 * Time entries resource handler
 */

import type { CommonArgs, HandlerContext, ToolResult } from './types.js';

import { ErrorMessages } from '../errors.js';
import { formatListResponse, formatTimeEntry } from '../formatters.js';
import { inputErrorResult, jsonResult } from './utils.js';

const VALID_ACTIONS = ['list', 'get', 'create', 'update'];

export async function handleTime(
  action: string,
  args: CommonArgs,
  ctx: HandlerContext,
): Promise<ToolResult> {
  const { api, formatOptions, filter, page, perPage } = ctx;
  const { id, person_id, service_id, task_id, time, date, note } = args;

  if (action === 'get') {
    if (!id) return inputErrorResult(ErrorMessages.missingId('get'));
    const result = await api.getTimeEntry(id);
    return jsonResult(formatTimeEntry(result.data, formatOptions));
  }

  if (action === 'create') {
    if (!person_id || !service_id || !time || !date) {
      return inputErrorResult(
        ErrorMessages.missingRequiredFields('time entry', [
          'person_id',
          'service_id',
          'time',
          'date',
        ]),
      );
    }
    const result = await api.createTimeEntry({
      person_id,
      service_id,
      time,
      date,
      note,
      task_id,
    });
    return jsonResult({ success: true, ...formatTimeEntry(result.data, formatOptions) });
  }

  if (action === 'update') {
    if (!id) return inputErrorResult(ErrorMessages.missingId('update'));
    const updateData: Parameters<typeof api.updateTimeEntry>[1] = {};
    if (time !== undefined) updateData.time = time;
    if (date !== undefined) updateData.date = date;
    if (note !== undefined) updateData.note = note;
    const result = await api.updateTimeEntry(id, updateData);
    return jsonResult({ success: true, ...formatTimeEntry(result.data, formatOptions) });
  }

  if (action === 'list') {
    const result = await api.getTimeEntries({ filter, page, perPage });
    return jsonResult(formatListResponse(result.data, formatTimeEntry, result.meta, formatOptions));
  }

  return inputErrorResult(ErrorMessages.invalidAction(action, 'time', VALID_ACTIONS));
}
