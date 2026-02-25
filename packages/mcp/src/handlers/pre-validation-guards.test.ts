/**
 * Tests for the pre-validation guard pipeline.
 *
 * Guards run on raw args BEFORE Zod parsing. This is especially important for
 * `detectParamsField`, which catches the `params` field before Zod's `.strip()`
 * silently removes it.
 */

import { describe, expect, it } from 'vitest';

import {
  PRE_VALIDATION_GUARDS,
  detectBudgetsResource,
  detectDocsResource,
  detectGetUnderscoreAction,
  detectParamsField,
  detectSearchAction,
  runPreValidationGuards,
} from './pre-validation-guards.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getText(result: ReturnType<typeof runPreValidationGuards>): string {
  if (!result) throw new Error('Expected a ToolResult but got null');
  return (result.content[0] as { text: string }).text;
}

// ---------------------------------------------------------------------------
// detectParamsField
// ---------------------------------------------------------------------------

describe('detectParamsField', () => {
  it('returns null when params is absent', () => {
    expect(detectParamsField({})).toBeNull();
    expect(detectParamsField({ resource: 'tasks', action: 'list' })).toBeNull();
    expect(detectParamsField({ filter: { assignee_id: 'me' } })).toBeNull();
  });

  it('returns null when params is explicitly undefined', () => {
    expect(detectParamsField({ params: undefined })).toBeNull();
  });

  it('returns an error result when params is an object', () => {
    const result = detectParamsField({ params: { assignee_id: 'me' } });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('"params"');
    expect(getText(result)).toContain('"filter"');
  });

  it('returns an error result when params is null (explicit null)', () => {
    const result = detectParamsField({ params: null });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
  });

  it('returns an error result when params is an empty object', () => {
    const result = detectParamsField({ params: {} });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
  });

  it('returns an error result when params is a string', () => {
    const result = detectParamsField({ params: 'something' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
  });

  it('includes a hint showing the filter example', () => {
    const result = detectParamsField({ params: { id: '1' } });
    expect(getText(result)).toContain('"filter"');
    expect(getText(result)).toContain('assignee_id');
  });
});

// ---------------------------------------------------------------------------
// detectBudgetsResource
// ---------------------------------------------------------------------------

describe('detectBudgetsResource', () => {
  it('returns null for other resources', () => {
    expect(detectBudgetsResource({})).toBeNull();
    expect(detectBudgetsResource({ resource: 'deals' })).toBeNull();
    expect(detectBudgetsResource({ resource: 'tasks' })).toBeNull();
    expect(detectBudgetsResource({ resource: 'projects' })).toBeNull();
  });

  it('returns null when resource is absent', () => {
    expect(detectBudgetsResource({ action: 'list' })).toBeNull();
  });

  it('returns an error result for resource="budgets"', () => {
    const result = detectBudgetsResource({ resource: 'budgets' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('"budgets"');
    expect(getText(result)).toContain('removed');
  });

  it('suggests using deals with type filter', () => {
    const result = detectBudgetsResource({ resource: 'budgets', action: 'list' });
    expect(getText(result)).toContain('deals');
    expect(getText(result)).toContain('filter[type]');
  });

  it('includes a hint about creating budgets via deals', () => {
    const result = detectBudgetsResource({ resource: 'budgets' });
    expect(getText(result)).toContain('budget=true');
  });
});

// ---------------------------------------------------------------------------
// detectDocsResource
// ---------------------------------------------------------------------------

describe('detectDocsResource', () => {
  it('returns null for other resources', () => {
    expect(detectDocsResource({})).toBeNull();
    expect(detectDocsResource({ resource: 'pages' })).toBeNull();
    expect(detectDocsResource({ resource: 'tasks' })).toBeNull();
  });

  it('returns null when resource is absent', () => {
    expect(detectDocsResource({ action: 'list' })).toBeNull();
  });

  it('returns an error result for resource="docs"', () => {
    const result = detectDocsResource({ resource: 'docs' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('"docs"');
    expect(getText(result)).toContain('"pages"');
  });

  it('suggests using resource="pages"', () => {
    const result = detectDocsResource({ resource: 'docs', action: 'list' });
    expect(getText(result)).toContain('pages');
  });

  it('includes a hint about help for pages', () => {
    const result = detectDocsResource({ resource: 'docs' });
    expect(getText(result)).toContain('action="help"');
    expect(getText(result)).toContain('pages');
  });
});

// ---------------------------------------------------------------------------
// detectSearchAction
// ---------------------------------------------------------------------------

describe('detectSearchAction', () => {
  it('returns null for non-search actions', () => {
    expect(detectSearchAction({ action: 'list', resource: 'tasks' })).toBeNull();
    expect(detectSearchAction({ action: 'get', resource: 'tasks' })).toBeNull();
    expect(detectSearchAction({ action: 'create', resource: 'tasks' })).toBeNull();
  });

  it('returns null when action is absent', () => {
    expect(detectSearchAction({ resource: 'tasks' })).toBeNull();
  });

  it('returns null for resource="search" with action="search" (legitimate)', () => {
    expect(detectSearchAction({ action: 'search', resource: 'search' })).toBeNull();
  });

  it('returns an error result for action="search" on a resource', () => {
    const result = detectSearchAction({ action: 'search', resource: 'tasks' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('action="search"');
    expect(getText(result)).toContain('resource="tasks"');
  });

  it('suggests action="list" with query parameter', () => {
    const result = detectSearchAction({ action: 'search', resource: 'projects' });
    expect(getText(result)).toContain('action="list"');
    expect(getText(result)).toContain('query=');
  });

  it('suggests resource="search" as alternative', () => {
    const result = detectSearchAction({ action: 'search', resource: 'tasks' });
    expect(getText(result)).toContain('resource="search"');
  });

  it('uses the provided resource name in the error message', () => {
    const result = detectSearchAction({ action: 'search', resource: 'deals' });
    expect(getText(result)).toContain('resource="deals"');
  });

  it('falls back to "tasks" when resource is not a string', () => {
    const result = detectSearchAction({ action: 'search', resource: 42 });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
  });

  it('returns an error when resource is absent but action is "search"', () => {
    const result = detectSearchAction({ action: 'search' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// detectGetUnderscoreAction
// ---------------------------------------------------------------------------

describe('detectGetUnderscoreAction', () => {
  it('returns null for valid plain-verb actions', () => {
    expect(detectGetUnderscoreAction({ action: 'get', resource: 'tasks' })).toBeNull();
    expect(detectGetUnderscoreAction({ action: 'list', resource: 'tasks' })).toBeNull();
    expect(detectGetUnderscoreAction({ action: 'create', resource: 'tasks' })).toBeNull();
    expect(detectGetUnderscoreAction({ action: 'update', resource: 'tasks' })).toBeNull();
    expect(detectGetUnderscoreAction({ action: 'delete', resource: 'tasks' })).toBeNull();
  });

  it('returns null when action is absent', () => {
    expect(detectGetUnderscoreAction({ resource: 'tasks' })).toBeNull();
  });

  it('returns null when action is not a string', () => {
    expect(detectGetUnderscoreAction({ action: 42 })).toBeNull();
  });

  it('returns an error result for action="get_tasks"', () => {
    const result = detectGetUnderscoreAction({ action: 'get_tasks', resource: 'tasks' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('action="get_tasks"');
    expect(getText(result)).toContain('not valid');
  });

  it('returns an error result for action="get_projects"', () => {
    const result = detectGetUnderscoreAction({ action: 'get_projects' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('action="get_projects"');
  });

  it('returns an error result for action="get_time_entries"', () => {
    const result = detectGetUnderscoreAction({ action: 'get_time_entries' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
  });

  it('suggests action="get" with id for single-item retrieval', () => {
    const result = detectGetUnderscoreAction({ action: 'get_tasks' });
    expect(getText(result)).toContain('action="get"');
    expect(getText(result)).toContain('id');
  });

  it('suggests action="list" for multiple items', () => {
    const result = detectGetUnderscoreAction({ action: 'get_tasks', resource: 'tasks' });
    expect(getText(result)).toContain('action="list"');
    expect(getText(result)).toContain('resource="tasks"');
  });

  it('uses the provided resource in hints when present', () => {
    const result = detectGetUnderscoreAction({ action: 'get_foo', resource: 'deals' });
    expect(getText(result)).toContain('resource="deals"');
  });

  it('falls back to derived resource name when resource is empty', () => {
    const result = detectGetUnderscoreAction({ action: 'get_tasks' });
    // suggestedResource = "tasks" derived from action
    expect(getText(result)).toContain('tasks');
  });
});

// ---------------------------------------------------------------------------
// PRE_VALIDATION_GUARDS array
// ---------------------------------------------------------------------------

describe('PRE_VALIDATION_GUARDS', () => {
  it('contains exactly 5 guards in order', () => {
    expect(PRE_VALIDATION_GUARDS).toHaveLength(5);
    expect(PRE_VALIDATION_GUARDS[0]).toBe(detectParamsField);
    expect(PRE_VALIDATION_GUARDS[1]).toBe(detectBudgetsResource);
    expect(PRE_VALIDATION_GUARDS[2]).toBe(detectDocsResource);
    expect(PRE_VALIDATION_GUARDS[3]).toBe(detectSearchAction);
    expect(PRE_VALIDATION_GUARDS[4]).toBe(detectGetUnderscoreAction);
  });
});

// ---------------------------------------------------------------------------
// runPreValidationGuards
// ---------------------------------------------------------------------------

describe('runPreValidationGuards', () => {
  it('returns null for empty args (all guards pass)', () => {
    expect(runPreValidationGuards({})).toBeNull();
  });

  it('returns null for valid well-formed args', () => {
    expect(
      runPreValidationGuards({
        resource: 'tasks',
        action: 'list',
        filter: { assignee_id: 'me' },
      }),
    ).toBeNull();
  });

  it('returns an error for params field (first guard)', () => {
    const result = runPreValidationGuards({ params: { assignee_id: 'me' } });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('"params"');
  });

  it('returns an error for resource="budgets"', () => {
    const result = runPreValidationGuards({ resource: 'budgets', action: 'list' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('"budgets"');
  });

  it('returns an error for resource="docs"', () => {
    const result = runPreValidationGuards({ resource: 'docs', action: 'list' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('"docs"');
  });

  it('returns an error for action="search" on a non-search resource', () => {
    const result = runPreValidationGuards({ resource: 'tasks', action: 'search' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('action="search"');
  });

  it('returns null for action="search" on resource="search" (valid)', () => {
    expect(runPreValidationGuards({ resource: 'search', action: 'search' })).toBeNull();
  });

  it('returns an error for action starting with "get_"', () => {
    const result = runPreValidationGuards({ resource: 'tasks', action: 'get_tasks' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(getText(result)).toContain('get_tasks');
  });

  it('returns the FIRST matching guard result (short-circuit)', () => {
    // Both params guard and budgets guard would fire, but params guard is first
    const result = runPreValidationGuards({ resource: 'budgets', params: { foo: 'bar' } });
    expect(result).not.toBeNull();
    // params guard fires first → message is about "params"
    expect(getText(result)).toContain('"params"');
    expect(getText(result)).not.toContain('"budgets"');
  });

  it('returns the FIRST matching guard result with docs + search combo', () => {
    // docs guard (index 2) fires before search guard (index 3)
    const result = runPreValidationGuards({ resource: 'docs', action: 'search' });
    expect(result).not.toBeNull();
    expect(getText(result)).toContain('"docs"');
    expect(getText(result)).not.toContain('action="search"');
  });
});
