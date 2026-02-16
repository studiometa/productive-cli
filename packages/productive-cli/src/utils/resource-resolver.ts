/**
 * Resource resolver for human-friendly identifier resolution.
 *
 * Allows users to reference resources by email, name, project number, etc.
 * instead of numeric IDs.
 *
 * @example
 * ```typescript
 * // Resolve person by email
 * const result = await resolve(api, 'user@example.com');
 * // { id: '500521', type: 'person', label: 'John Doe' }
 *
 * // Resolve project by number
 * const result = await resolve(api, 'PRJ-001');
 * // { id: '777332', type: 'project', label: 'Client Website' }
 *
 * // Explicit type
 * const result = await resolve(api, 'Development', { type: 'service', projectId: '777332' });
 * ```
 */

import type { ProductiveApi } from '../api.js';
import type { CacheStore } from './cache.js';

import { getSqliteCache } from './sqlite-cache.js';

/**
 * Supported resource types for resolution
 */
export type ResolvableResourceType = 'person' | 'project' | 'company' | 'deal' | 'service';

/**
 * Result of a successful resolution
 */
export interface ResolveResult {
  id: string;
  type: ResolvableResourceType;
  label: string;
  /** The original query that was resolved */
  query: string;
  /** Whether this was an exact match (email, project number) vs fuzzy (name search) */
  exact: boolean;
}

/**
 * Options for resolve operations
 */
export interface ResolveOptions {
  /** Explicit resource type (overrides auto-detection) */
  type?: ResolvableResourceType;
  /** Project context (required for service resolution) */
  projectId?: string;
  /** Return first match if multiple results */
  first?: boolean;
  /** Use cache for lookups */
  cache?: CacheStore;
  /** Organization ID for cache key */
  orgId?: string;
}

/**
 * Detection result from pattern matching
 */
export interface DetectionResult {
  type: ResolvableResourceType;
  confidence: 'high' | 'medium' | 'low';
  pattern: string;
}

/**
 * Error thrown when resolution fails
 */
export class ResolveError extends Error {
  constructor(
    message: string,
    public query: string,
    public type?: ResolvableResourceType,
    public suggestions?: ResolveResult[],
  ) {
    super(message);
    this.name = 'ResolveError';
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      query: this.query,
      type: this.type,
      suggestions: this.suggestions,
    };
  }
}

/**
 * Email pattern: user@domain.tld
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Project number pattern: PRJ-123, P-123
 */
const PROJECT_NUMBER_PATTERN = /^(PRJ|P)-\d+$/i;

/**
 * Deal number pattern: D-123, DEAL-123
 */
const DEAL_NUMBER_PATTERN = /^(D|DEAL)-\d+$/i;

/**
 * Numeric ID pattern (passthrough, no resolution needed)
 */
const NUMERIC_ID_PATTERN = /^\d+$/;

/**
 * Detect resource type from query string pattern
 */
export function detectResourceType(query: string): DetectionResult | null {
  // Skip numeric IDs - they don't need resolution
  if (NUMERIC_ID_PATTERN.test(query)) {
    return null;
  }

  // Email → person (high confidence)
  if (EMAIL_PATTERN.test(query)) {
    return { type: 'person', confidence: 'high', pattern: 'email' };
  }

  // Project number → project (high confidence)
  if (PROJECT_NUMBER_PATTERN.test(query)) {
    return { type: 'project', confidence: 'high', pattern: 'project_number' };
  }

  // Deal number → deal (high confidence)
  if (DEAL_NUMBER_PATTERN.test(query)) {
    return { type: 'deal', confidence: 'high', pattern: 'deal_number' };
  }

  // No pattern match - type must be specified
  return null;
}

/**
 * Check if a value is a numeric ID (no resolution needed)
 */
export function isNumericId(value: string): boolean {
  return NUMERIC_ID_PATTERN.test(value);
}

/**
 * Check if a value needs resolution (not a numeric ID)
 */
export function needsResolution(value: string): boolean {
  return !isNumericId(value);
}

/**
 * Resolve a person by email address
 */
export async function resolvePersonByEmail(
  api: ProductiveApi,
  email: string,
): Promise<ResolveResult | null> {
  const response = await api.getPeople({
    filter: { email },
    perPage: 1,
  });

  if (response.data.length === 0) {
    return null;
  }

  const person = response.data[0];
  const firstName = person.attributes.first_name || '';
  const lastName = person.attributes.last_name || '';

  return {
    id: person.id,
    type: 'person',
    label: `${firstName} ${lastName}`.trim() || email,
    query: email,
    exact: true,
  };
}

/**
 * Resolve a person by name search
 */
export async function resolvePersonByName(
  api: ProductiveApi,
  name: string,
): Promise<ResolveResult[]> {
  const response = await api.getPeople({
    filter: { query: name },
    perPage: 10,
  });

  return response.data.map((person) => ({
    id: person.id,
    type: 'person' as const,
    label: `${person.attributes.first_name || ''} ${person.attributes.last_name || ''}`.trim(),
    query: name,
    exact: false,
  }));
}

/**
 * Resolve a project by project number
 */
export async function resolveProjectByNumber(
  api: ProductiveApi,
  projectNumber: string,
): Promise<ResolveResult | null> {
  // Normalize: accept both "PRJ-123" and "P-123"
  const normalizedNumber = projectNumber.toUpperCase().replace(/^P-/, 'PRJ-');

  const response = await api.getProjects({
    filter: { project_number: normalizedNumber },
    perPage: 1,
  });

  if (response.data.length === 0) {
    // Try without prefix normalization
    const altResponse = await api.getProjects({
      filter: { project_number: projectNumber },
      perPage: 1,
    });

    if (altResponse.data.length === 0) {
      return null;
    }

    const project = altResponse.data[0];
    return {
      id: project.id,
      type: 'project',
      label: project.attributes.name || projectNumber,
      query: projectNumber,
      exact: true,
    };
  }

  const project = response.data[0];
  return {
    id: project.id,
    type: 'project',
    label: project.attributes.name || projectNumber,
    query: projectNumber,
    exact: true,
  };
}

/**
 * Resolve a project by name search
 */
export async function resolveProjectByName(
  api: ProductiveApi,
  name: string,
): Promise<ResolveResult[]> {
  const response = await api.getProjects({
    filter: { query: name },
    perPage: 10,
  });

  return response.data.map((project) => ({
    id: project.id,
    type: 'project' as const,
    label: project.attributes.name || '',
    query: name,
    exact: false,
  }));
}

/**
 * Resolve a company by name search
 */
export async function resolveCompanyByName(
  api: ProductiveApi,
  name: string,
): Promise<ResolveResult[]> {
  const response = await api.getCompanies({
    filter: { query: name },
    perPage: 10,
  });

  return response.data.map((company) => ({
    id: company.id,
    type: 'company' as const,
    label: company.attributes.name || '',
    query: name,
    exact: false,
  }));
}

/**
 * Resolve a deal by deal number
 */
export async function resolveDealByNumber(
  api: ProductiveApi,
  dealNumber: string,
): Promise<ResolveResult | null> {
  // Normalize: accept both "D-123" and "DEAL-123"
  const normalizedNumber = dealNumber.toUpperCase().replace(/^DEAL-/, 'D-');

  const response = await api.getDeals({
    filter: { deal_number: normalizedNumber },
    perPage: 1,
  });

  if (response.data.length === 0) {
    // Try without prefix normalization
    const altResponse = await api.getDeals({
      filter: { deal_number: dealNumber },
      perPage: 1,
    });

    if (altResponse.data.length === 0) {
      return null;
    }

    const deal = altResponse.data[0];
    return {
      id: deal.id,
      type: 'deal',
      label: deal.attributes.name || dealNumber,
      query: dealNumber,
      exact: true,
    };
  }

  const deal = response.data[0];
  return {
    id: deal.id,
    type: 'deal',
    label: deal.attributes.name || dealNumber,
    query: dealNumber,
    exact: true,
  };
}

/**
 * Resolve a deal by name search
 */
export async function resolveDealByName(
  api: ProductiveApi,
  name: string,
): Promise<ResolveResult[]> {
  const response = await api.getDeals({
    filter: { query: name },
    perPage: 10,
  });

  return response.data.map((deal) => ({
    id: deal.id,
    type: 'deal' as const,
    label: deal.attributes.name || '',
    query: name,
    exact: false,
  }));
}

/**
 * Resolve a service by name within a project
 */
export async function resolveServiceByName(
  api: ProductiveApi,
  name: string,
  projectId?: string,
): Promise<ResolveResult[]> {
  const filter: Record<string, string> = {};

  if (projectId) {
    filter.project_id = projectId;
  }

  // Services API doesn't support query filter, so we fetch and filter client-side
  const response = await api.getServices({
    filter,
    perPage: 200, // Get more to search through
  });

  const nameLower = name.toLowerCase();
  const matches = response.data.filter((service) =>
    (service.attributes.name || '').toLowerCase().includes(nameLower),
  );

  return matches.map((service) => ({
    id: service.id,
    type: 'service' as const,
    label: service.attributes.name || '',
    query: name,
    exact: (service.attributes.name || '').toLowerCase() === nameLower,
  }));
}

/**
 * Cache key for resolved mappings
 */
function getResolveCacheKey(orgId: string, type: ResolvableResourceType, query: string): string {
  return `resolve:${orgId}:${type}:${query.toLowerCase()}`;
}

/**
 * Cache TTLs by match type
 */
const CACHE_TTL = {
  exact: 24 * 60 * 60 * 1000, // 24 hours for exact matches (email, project number)
  fuzzy: 60 * 60 * 1000, // 1 hour for name searches
};

/**
 * Get cached resolution result
 */
async function getCachedResolve(
  orgId: string,
  type: ResolvableResourceType,
  query: string,
): Promise<ResolveResult | null> {
  try {
    const cache = getSqliteCache(orgId);
    const key = getResolveCacheKey(orgId, type, query);
    const result = await cache.cacheGet<ResolveResult>(key);
    return result;
  } catch {
    return null;
  }
}

/**
 * Cache a resolution result
 */
async function setCachedResolve(orgId: string, result: ResolveResult): Promise<void> {
  try {
    const cache = getSqliteCache(orgId);
    const key = getResolveCacheKey(orgId, result.type, result.query);
    const ttl = result.exact ? CACHE_TTL.exact : CACHE_TTL.fuzzy;
    await cache.cacheSet(key, result, '/resolve', ttl);
  } catch {
    // Silently fail cache writes
  }
}

/**
 * Main resolve function - resolves a human-friendly identifier to an ID
 *
 * @param api - ProductiveApi instance
 * @param query - The query string (email, name, project number, etc.)
 * @param options - Resolution options
 * @returns Array of matching results
 * @throws ResolveError if no matches found
 */
export async function resolve(
  api: ProductiveApi,
  query: string,
  options: ResolveOptions = {},
): Promise<ResolveResult[]> {
  const { type, projectId, first, orgId } = options;

  // If it's a numeric ID, return it as-is (no resolution needed)
  if (isNumericId(query)) {
    return [
      {
        id: query,
        type: type || 'project', // Default to project for numeric IDs
        label: query,
        query,
        exact: true,
      },
    ];
  }

  // Try cache first
  if (orgId) {
    const resourceType = type || detectResourceType(query)?.type;
    if (resourceType) {
      const cached = await getCachedResolve(orgId, resourceType, query);
      if (cached) {
        return [cached];
      }
    }
  }

  // Determine resource type
  let resourceType = type;
  let pattern: string | undefined;

  if (!resourceType) {
    const detection = detectResourceType(query);
    if (detection) {
      resourceType = detection.type;
      pattern = detection.pattern;
    } else {
      throw new ResolveError(
        `Cannot determine resource type for "${query}". Use --type to specify.`,
        query,
      );
    }
  }

  // Resolve based on type and pattern
  let results: ResolveResult[] = [];

  switch (resourceType) {
    case 'person':
      if (pattern === 'email' || EMAIL_PATTERN.test(query)) {
        const result = await resolvePersonByEmail(api, query);
        results = result ? [result] : [];
      } else {
        results = await resolvePersonByName(api, query);
      }
      break;

    case 'project':
      if (pattern === 'project_number' || PROJECT_NUMBER_PATTERN.test(query)) {
        const result = await resolveProjectByNumber(api, query);
        results = result ? [result] : [];
      } else {
        results = await resolveProjectByName(api, query);
      }
      break;

    case 'company':
      results = await resolveCompanyByName(api, query);
      break;

    case 'deal':
      if (pattern === 'deal_number' || DEAL_NUMBER_PATTERN.test(query)) {
        const result = await resolveDealByNumber(api, query);
        results = result ? [result] : [];
      } else {
        results = await resolveDealByName(api, query);
      }
      break;

    case 'service':
      results = await resolveServiceByName(api, query, projectId);
      break;
  }

  // Handle no matches
  if (results.length === 0) {
    throw new ResolveError(`No ${resourceType} found matching "${query}"`, query, resourceType);
  }

  // Cache exact matches or single results
  if (orgId && results.length === 1) {
    await setCachedResolve(orgId, results[0]);
  }

  // Return first match if requested
  if (first && results.length > 1) {
    return [results[0]];
  }

  return results;
}

/**
 * Resolve a filter value if it needs resolution, or return as-is if numeric
 *
 * @param api - ProductiveApi instance
 * @param value - The filter value (ID or human-friendly identifier)
 * @param type - The resource type to resolve to
 * @param options - Additional resolution options
 * @returns Resolved ID
 * @throws ResolveError if resolution fails
 */
export async function resolveFilterValue(
  api: ProductiveApi,
  value: string,
  type: ResolvableResourceType,
  options: Omit<ResolveOptions, 'type'> = {},
): Promise<string> {
  if (isNumericId(value)) {
    return value;
  }

  const results = await resolve(api, value, { ...options, type, first: true });

  if (results.length === 0) {
    throw new ResolveError(`No ${type} found matching "${value}"`, value, type);
  }

  return results[0].id;
}

/**
 * Metadata about resolved filters (for response enrichment)
 */
export interface ResolvedMetadata {
  [key: string]: {
    input: string;
    id: string;
    label: string;
    reusable: boolean;
  };
}

/**
 * Resolve multiple filter IDs and return metadata
 *
 * @param api - ProductiveApi instance
 * @param filters - Object mapping filter names to values
 * @param typeMapping - Object mapping filter names to resource types
 * @param options - Resolution options
 * @returns Object with resolved IDs and metadata
 */
export async function resolveFilterIds(
  api: ProductiveApi,
  filters: Record<string, string>,
  typeMapping: Record<string, ResolvableResourceType>,
  options: Omit<ResolveOptions, 'type'> = {},
): Promise<{ resolved: Record<string, string>; metadata: ResolvedMetadata }> {
  const resolved: Record<string, string> = {};
  const metadata: ResolvedMetadata = {};

  for (const [key, value] of Object.entries(filters)) {
    const type = typeMapping[key];

    if (!type || isNumericId(value)) {
      // No type mapping or already a numeric ID
      resolved[key] = value;
      continue;
    }

    try {
      const results = await resolve(api, value, { ...options, type, first: true });

      if (results.length > 0) {
        const result = results[0];
        resolved[key] = result.id;
        metadata[key] = {
          input: value,
          id: result.id,
          label: result.label,
          reusable: result.exact,
        };
      } else {
        resolved[key] = value; // Keep original if resolution fails
      }
    } catch {
      resolved[key] = value; // Keep original on error
    }
  }

  return { resolved, metadata };
}
