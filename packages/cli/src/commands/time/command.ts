/**
 * Time command entry point
 *
 * Handles command routing and dispatches to appropriate handlers.
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { timeList, timeGet, timeAdd, timeUpdate, timeDelete } from './handlers.js';

/**
 * Handle time command
 */
export const handleTimeCommand = createCommandRouter({
  resource: 'time',
  handlers: {
    list: timeList,
    ls: timeList,
    get: [timeGet, 'args'],
    add: timeAdd,
    update: [timeUpdate, 'args'],
    delete: [timeDelete, 'args'],
    rm: [timeDelete, 'args'],
  },
});
