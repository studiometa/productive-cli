/**
 * Bookings command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
import { bookingsList, bookingsGet, bookingsAdd, bookingsUpdate } from './handlers.js';

/**
 * Handle bookings command
 */
export const handleBookingsCommand = createCommandRouter({
  resource: 'bookings',
  handlers: {
    list: bookingsList,
    ls: bookingsList,
    get: [bookingsGet, 'args'],
    add: bookingsAdd,
    create: bookingsAdd,
    update: [bookingsUpdate, 'args'],
  },
});
