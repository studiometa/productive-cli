/**
 * People command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { peopleList, peopleGet } from './handlers.js';

/**
 * Handle people command
 */
export const handlePeopleCommand = createCommandRouter({
  resource: 'people',
  handlers: {
    list: peopleList,
    ls: peopleList,
    get: [peopleGet, 'args'],
  },
});
