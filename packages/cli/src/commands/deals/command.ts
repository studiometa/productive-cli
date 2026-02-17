/**
 * Deals command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { dealsList, dealsGet, dealsAdd, dealsUpdate } from './handlers.js';

/**
 * Handle deals command
 */
export const handleDealsCommand = createCommandRouter({
  resource: 'deals',
  handlers: {
    list: dealsList,
    ls: dealsList,
    get: [dealsGet, 'args'],
    add: dealsAdd,
    create: dealsAdd,
    update: [dealsUpdate, 'args'],
  },
});
