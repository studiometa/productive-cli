/**
 * Comments command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { commentsList, commentsGet, commentsAdd, commentsUpdate } from './handlers.js';

/**
 * Handle comments command
 */
export const handleCommentsCommand = createCommandRouter({
  resource: 'comments',
  handlers: {
    list: commentsList,
    ls: commentsList,
    get: [commentsGet, 'args'],
    add: commentsAdd,
    create: commentsAdd,
    update: [commentsUpdate, 'args'],
  },
});
