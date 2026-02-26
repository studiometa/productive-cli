/**
 * Pre-validation guard pipeline for the productive MCP tool.
 *
 * Guards run against raw args BEFORE Zod schema parsing. This catches common
 * agent mistakes that Zod `.strip()` would silently swallow (e.g. passing
 * `params` instead of `filter`).
 *
 * Each guard returns a `ToolResult` when it detects a bad pattern, or `null`
 * to signal that the args look fine and the next guard should run.
 */

import type { ToolResult } from './types.js';

import { UserInputError } from '../errors.js';
import { inputErrorResult } from './utils.js';

/**
 * A pre-validation guard function.
 * Returns a ToolResult (error) when a bad pattern is detected, or null to pass.
 */
export type PreValidationGuard = (args: Record<string, unknown>) => ToolResult | null;

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * Detects the classic `params` mistake.
 *
 * Agents familiar with REST conventions often pass `params` as a top-level
 * field. Zod's `.strip()` silently removes it before any post-parse check
 * could fire, so this must run on the raw args.
 */
export function detectParamsField(args: Record<string, unknown>): ToolResult | null {
  if (args.params === undefined) return null;

  return inputErrorResult(
    new UserInputError('Unknown field "params". Use "filter" instead.', [
      'Example: { "filter": { "assignee_id": "me" } }',
      'The MCP tool uses "filter" for query parameters, not "params"',
    ]),
  );
}

/**
 * Detects `resource="budgets"` and redirects to `deals` with a type filter.
 *
 * The "budgets" resource was removed. Budgets are deals with `type=2`.
 */
export function detectBudgetsResource(args: Record<string, unknown>): ToolResult | null {
  if (args.resource !== 'budgets') return null;

  return inputErrorResult(
    new UserInputError('The "budgets" resource has been removed. Budgets are deals with type=2.', [
      'Use resource="deals" with filter[type]="2" to list only budgets',
      'To create a budget: resource="deals" action="create" with budget=true',
      'Use action="help" resource="deals" for full documentation',
    ]),
  );
}

/**
 * Detects `resource="docs"` and redirects to `pages`.
 */
export function detectDocsResource(args: Record<string, unknown>): ToolResult | null {
  if (args.resource !== 'docs') return null;

  return inputErrorResult(
    new UserInputError('Unknown resource "docs". Did you mean "pages"?', [
      'Use resource="pages" to access Productive pages/documents',
      'Use action="list" to list all pages',
      'Use action="help" resource="pages" for full documentation',
    ]),
  );
}

/**
 * Detects `action="search"` used on a specific resource.
 *
 * Agents should use `action="list"` with a `query` parameter for text
 * filtering within a single resource, or `resource="search"` for
 * cross-resource search. This guard only fires when `resource` is not
 * already `"search"` to avoid blocking the legitimate search resource.
 */
export function detectSearchAction(args: Record<string, unknown>): ToolResult | null {
  if (args.action !== 'search') return null;
  if (args.resource === 'search') return null;

  const resource = typeof args.resource === 'string' ? args.resource : 'tasks';

  return inputErrorResult(
    new UserInputError(
      `action="search" is not supported on resource="${resource}". Use action="list" with a query parameter for text filtering, or use resource="search" for cross-resource search.`,
      [
        `Use resource="${resource}" action="list" with query="<your search terms>" to filter ${resource}`,
        'Use resource="search" action="run" with query="<your search terms>" to search across all resources',
        `Use action="help" resource="${resource}" to see all supported actions and filters`,
      ],
    ),
  );
}

/**
 * Detects `action` values that start with `get_`.
 *
 * Agents using function-style naming (e.g. `get_tasks`, `get_projects`)
 * should use plain verbs: `action="get"` for a single item or
 * `action="list"` for multiple items.
 */
export function detectGetUnderscoreAction(args: Record<string, unknown>): ToolResult | null {
  if (typeof args.action !== 'string') return null;
  if (!args.action.startsWith('get_')) return null;

  const suggestedResource = args.action.replace(/^get_/, '').replace(/_/g, ' ');
  const resource =
    typeof args.resource === 'string' && args.resource ? args.resource : suggestedResource;

  return inputErrorResult(
    new UserInputError(
      `action="${args.action}" is not valid. Actions use simple verbs like "list", "get", "create", not function-style names.`,
      [
        'To retrieve a single item, use action="get" with an id parameter',
        `To retrieve multiple items, use action="list" (e.g. resource="${resource}" action="list")`,
        `Use action="help" resource="${resource}" to see all supported actions for a resource`,
      ],
    ),
  );
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Ordered list of pre-validation guards.
 * Guards are evaluated in order; the first match short-circuits the pipeline.
 */
export const PRE_VALIDATION_GUARDS: PreValidationGuard[] = [
  detectParamsField,
  detectBudgetsResource,
  detectDocsResource,
  detectSearchAction,
  detectGetUnderscoreAction,
];

/**
 * Run all pre-validation guards against raw args.
 *
 * Returns the first guard's ToolResult on a match, or `null` if all guards
 * pass (meaning the args look structurally sound and Zod parsing can proceed).
 */
export function runPreValidationGuards(args: Record<string, unknown>): ToolResult | null {
  for (const guard of PRE_VALIDATION_GUARDS) {
    const result = guard(args);
    if (result !== null) return result;
  }
  return null;
}
