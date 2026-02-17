/**
 * Projects command entry point
 *
 * Handles command routing and dispatches to appropriate handlers.
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { projectsList, projectsGet } from './handlers.js';

/**
 * Handle projects command
 */
export const handleProjectsCommand = createCommandRouter({
  resource: 'projects',
  handlers: {
    list: projectsList,
    ls: projectsList,
    get: [projectsGet, 'args'],
  },
});
