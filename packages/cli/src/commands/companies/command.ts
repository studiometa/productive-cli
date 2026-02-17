/**
 * Companies command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { companiesList, companiesGet, companiesAdd, companiesUpdate } from './handlers.js';

/**
 * Handle companies command
 */
export const handleCompaniesCommand = createCommandRouter({
  resource: 'companies',
  handlers: {
    list: companiesList,
    ls: companiesList,
    get: [companiesGet, 'args'],
    add: companiesAdd,
    create: companiesAdd,
    update: [companiesUpdate, 'args'],
  },
});
