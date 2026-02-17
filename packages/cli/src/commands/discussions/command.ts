/**
 * Discussions command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import {
  discussionsList,
  discussionsGet,
  discussionsAdd,
  discussionsUpdate,
  discussionsDelete,
  discussionsResolve,
  discussionsReopen,
} from './handlers.js';

/**
 * Handle discussions command
 */
export const handleDiscussionsCommand = createCommandRouter({
  resource: 'discussions',
  handlers: {
    list: discussionsList,
    ls: discussionsList,
    get: [discussionsGet, 'args'],
    add: discussionsAdd,
    create: discussionsAdd,
    update: [discussionsUpdate, 'args'],
    delete: [discussionsDelete, 'args'],
    rm: [discussionsDelete, 'args'],
    resolve: [discussionsResolve, 'args'],
    reopen: [discussionsReopen, 'args'],
  },
});
