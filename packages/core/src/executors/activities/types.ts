/**
 * Option types for activities executors.
 */

import type { PaginationOptions } from '../types.js';

export interface ListActivitiesOptions extends PaginationOptions {
  /**
   * Additional API-level filters passed directly to the endpoint.
   * Known filters: event ('create'|'update'|'delete'), after (ISO timestamp),
   * person_id, project_id.
   */
  additionalFilters?: Record<string, string>;
  /** Include relationships in the response (e.g. 'creator') */
  include?: string[];
}
