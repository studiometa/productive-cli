/**
 * Timers command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { timersList, timersGet, timersStart, timersStop } from './handlers.js';

/**
 * Handle timers command
 */
export const handleTimersCommand = createCommandRouter({
  resource: 'timers',
  handlers: {
    list: timersList,
    ls: timersList,
    get: [timersGet, 'args'],
    start: timersStart,
    stop: [timersStop, 'args'],
  },
});
