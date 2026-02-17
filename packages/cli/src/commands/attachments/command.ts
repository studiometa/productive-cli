/**
 * Attachments command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { attachmentsList, attachmentsGet, attachmentsDelete } from './handlers.js';

/**
 * Handle attachments command
 */
export const handleAttachmentsCommand = createCommandRouter({
  resource: 'attachments',
  handlers: {
    list: attachmentsList,
    ls: attachmentsList,
    get: [attachmentsGet, 'args'],
    delete: [attachmentsDelete, 'args'],
    rm: [attachmentsDelete, 'args'],
  },
});
