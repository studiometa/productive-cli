/**
 * Pages command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { pagesList, pagesGet, pagesAdd, pagesUpdate, pagesDelete } from './handlers.js';

/**
 * Handle pages command
 */
export const handlePagesCommand = createCommandRouter({
  resource: 'pages',
  handlers: {
    list: pagesList,
    ls: pagesList,
    get: [pagesGet, 'args'],
    add: pagesAdd,
    create: pagesAdd,
    update: [pagesUpdate, 'args'],
    delete: [pagesDelete, 'args'],
    rm: [pagesDelete, 'args'],
  },
});
