/**
 * Custom fields command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { customFieldsGet, customFieldsList } from './handlers.js';

/**
 * Handle custom-fields command
 */
export const handleCustomFieldsCommand = createCommandRouter({
  resource: 'custom-fields',
  handlers: {
    list: customFieldsList,
    ls: customFieldsList,
    get: [customFieldsGet, 'args'],
  },
});
