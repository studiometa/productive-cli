/**
 * Activities MCP handler.
 *
 * Uses the createResourceHandler factory for the common list pattern.
 * Activities are read-only — only `list` is supported.
 */

import { listActivities } from '@studiometa/productive-core';

import type { CommonArgs } from './types.js';

import { formatActivity } from '../formatters.js';
import { createResourceHandler } from './factory.js';

/**
 * Args for activity list requests.
 */
export interface ActivityArgs extends CommonArgs {
  /** ISO timestamp — return activities after this date */
  after?: string;
  /** Filter by event type: create | update | delete */
  event?: string;
}

/**
 * Handle activities resource.
 *
 * Supports: list
 */
export const handleActivities = createResourceHandler<ActivityArgs>({
  resource: 'activities',
  actions: ['list'],
  formatter: formatActivity,
  executors: {
    list: listActivities,
  },
  defaultInclude: { list: ['creator'] },
  listFilterFromArgs: (args) => {
    const filter: Record<string, string> = {};
    if (args.after) filter.after = args.after;
    if (args.event) filter.event = args.event;
    return filter;
  },
});
