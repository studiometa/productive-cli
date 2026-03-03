/**
 * Option types for custom-fields executors.
 */

import type { PaginationOptions } from '../types.js';

export interface ListCustomFieldsOptions extends PaginationOptions {
  /** Filter by customizable type (e.g. 'Task', 'Deal', 'Company') */
  customizable_type?: string;
  /** Filter by archived status */
  archived?: boolean;
  /** Additional API-level filters */
  additionalFilters?: Record<string, string>;
  /** Include relationships in the response (e.g. 'options') */
  include?: string[];
}

export interface GetCustomFieldOptions {
  /** Custom field ID */
  id: string;
  /** Include relationships in the response (e.g. 'options') */
  include?: string[];
}
