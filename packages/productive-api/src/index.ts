/**
 * @studiometa/productive-api
 *
 * Productive.io API client, types, and formatters.
 * Zero internal dependencies — this is the foundation package.
 */

// API client
export { ProductiveApi } from './client.js';
export type { ApiOptions } from './client.js';

// Error
export { ProductiveApiError } from './error.js';

// Cache interface
export type { ApiCache } from './cache.js';
export { noopCache } from './cache.js';

// Types
export type {
  IncludedResource,
  ProductiveApiMeta,
  ProductiveApiResponse,
  ProductiveBooking,
  ProductiveBudget,
  ProductiveComment,
  ProductiveCompany,
  ProductiveConfig,
  ProductiveDeal,
  ProductivePerson,
  ProductiveProject,
  ProductiveReport,
  ProductiveService,
  ProductiveTask,
  ProductiveTimeEntry,
  ProductiveTimer,
  RelationshipData,
} from './types.js';

// Formatters
export {
  formatTimeEntry,
  formatProject,
  formatTask,
  formatPerson,
  formatService,
  formatCompany,
  formatComment,
  formatTimer,
  formatDeal,
  formatBooking,
  formatBudget,
  formatListResponse,
} from './formatters/index.js';

export type {
  FormatOptions,
  FormattedPagination,
  JsonApiMeta,
  JsonApiResource,
  JsonApiResponse,
} from './formatters/types.js';

// Config (env vars + JSON file, no keychain)
export { getConfig, setConfig, deleteConfig, clearConfig } from './config.js';

// Utils
export { stripHtml, truncate } from './utils/html.js';
