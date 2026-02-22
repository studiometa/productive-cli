/**
 * Activities command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { activitiesList } from './handlers.js';

/**
 * Handle activities command
 */
export const handleActivitiesCommand = createCommandRouter({
  resource: 'activities',
  handlers: {
    list: activitiesList,
    ls: activitiesList,
  },
});
