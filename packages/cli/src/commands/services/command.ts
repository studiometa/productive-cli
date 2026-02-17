/**
 * Services command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { servicesList } from './handlers.js';

/**
 * Handle services command
 */
export const handleServicesCommand = createCommandRouter({
  resource: 'services',
  handlers: {
    list: servicesList,
    ls: servicesList,
  },
});
