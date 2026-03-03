/**
 * Custom Fields MCP handler.
 *
 * Uses the createResourceHandler factory for list/get.
 * Custom fields are read-only — only `list` and `get` are supported.
 */

import { listCustomFields, getCustomField } from '@studiometa/productive-core';

import type { CommonArgs } from './types.js';

import { formatCustomField } from '../formatters.js';
import { getCustomFieldHints } from '../hints.js';
import { createResourceHandler } from './factory.js';

/**
 * Args for custom field requests.
 */
export interface CustomFieldArgs extends CommonArgs {
  /** Filter by customizable type (e.g. 'Task', 'Deal', 'Company') */
  customizable_type?: string;
  /** Filter by archived status */
  archived?: string;
}

/**
 * Handle custom_fields resource.
 *
 * Supports: list, get
 */
export const handleCustomFields = createResourceHandler<CustomFieldArgs>({
  resource: 'custom_fields',
  displayName: 'custom field',
  actions: ['list', 'get'],
  formatter: formatCustomField,
  hints: (_data, id) => getCustomFieldHints(id),
  executors: {
    list: listCustomFields,
    get: getCustomField,
  },
  defaultInclude: { get: ['options'] },
  listFilterFromArgs: (args) => {
    const filter: Record<string, string> = {};
    if (args.customizable_type) filter.customizable_type = args.customizable_type;
    if (args.archived) filter.archived = args.archived;
    return filter;
  },
});
