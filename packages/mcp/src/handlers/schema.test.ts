import { describe, expect, it } from 'vitest';

import { handleSchema, handleSchemaOverview } from './schema.js';

describe('handleSchema', () => {
  it('returns correct structure for time resource', () => {
    const result = handleSchema('time');

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);

    expect(data.resource).toBe('time');
    expect(data.actions).toEqual(['list', 'get', 'create', 'update', 'delete']);
    expect(data.filters).toBeDefined();
    expect(data.filters.person_id).toContain('me');
    expect(data.filters.after).toContain('YYYY-MM-DD');
    expect(data.filters.status).toContain('approved');
    expect(data.create).toBeDefined();
    expect(data.create.person_id).toEqual({ required: true, type: 'string' });
    expect(data.create.service_id).toEqual({ required: true, type: 'string' });
    expect(data.create.date).toEqual({ required: true, type: 'date YYYY-MM-DD' });
    expect(data.create.time).toEqual({ required: true, type: 'minutes integer' });
    expect(data.create.note).toEqual({ required: false, type: 'string' });
    expect(data.includes).toEqual(['person', 'service', 'task']);
  });

  it('returns structure without create for projects (read-only resource)', () => {
    const result = handleSchema('projects');

    expect(result.isError).toBeUndefined();

    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);

    expect(data.resource).toBe('projects');
    expect(data.actions).toEqual(['list', 'get', 'resolve']);
    expect(data.filters).toBeDefined();
    expect(data.filters.query).toBeDefined();
    expect(data.filters.project_type).toBeDefined();
    expect(data.create).toBeUndefined();
    expect(data.includes).toBeUndefined();
  });

  it('returns structure with create for tasks', () => {
    const result = handleSchema('tasks');

    expect(result.isError).toBeUndefined();

    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);

    expect(data.resource).toBe('tasks');
    expect(data.actions).toContain('create');
    expect(data.create).toBeDefined();
    expect(data.create.title.required).toBe(true);
    expect(data.create.project_id.required).toBe(true);
    expect(data.create.task_list_id.required).toBe(true);
    expect(data.create.description.required).toBe(false);
    expect(data.includes).toContain('project');
    expect(data.includes).toContain('assignee');
    expect(data.includes).toContain('comments');
  });

  it('returns error for unknown resource', () => {
    const result = handleSchema('unknown');

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');

    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('Unknown resource');
    expect(text).toContain('unknown');
    expect(text).toContain('Valid resources');
  });

  it('returns correct structure for deals with includes', () => {
    const result = handleSchema('deals');

    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);

    expect(data.resource).toBe('deals');
    expect(data.actions).toContain('create');
    expect(data.create.name.required).toBe(true);
    expect(data.create.company_id.required).toBe(true);
    expect(data.includes).toContain('company');
    expect(data.includes).toContain('deal_status');
  });

  it('returns correct structure for reports', () => {
    const result = handleSchema('reports');

    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);

    expect(data.resource).toBe('reports');
    expect(data.actions).toEqual(['get']);
    expect(data.create).toBeDefined();
    expect(data.create.report_type.required).toBe(true);
  });
});

describe('handleSchemaOverview', () => {
  it('returns list with all resource names', () => {
    const result = handleSchemaOverview();

    expect(result.isError).toBeUndefined();

    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);

    expect(data._tip).toContain('action="schema"');
    expect(data.resources).toBeDefined();
    expect(Array.isArray(data.resources)).toBe(true);

    // Check all expected resources are present
    const resourceNames = data.resources.map((r: { resource: string }) => r.resource);
    expect(resourceNames).toContain('projects');
    expect(resourceNames).toContain('time');
    expect(resourceNames).toContain('tasks');
    expect(resourceNames).toContain('services');
    expect(resourceNames).toContain('people');
    expect(resourceNames).toContain('companies');
    expect(resourceNames).toContain('comments');
    expect(resourceNames).toContain('attachments');
    expect(resourceNames).toContain('timers');
    expect(resourceNames).toContain('deals');
    expect(resourceNames).toContain('bookings');
    expect(resourceNames).toContain('pages');
    expect(resourceNames).toContain('discussions');
    expect(resourceNames).toContain('reports');
  });

  it('each resource has actions array', () => {
    const result = handleSchemaOverview();
    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);

    for (const resource of data.resources) {
      expect(resource.resource).toBeDefined();
      expect(Array.isArray(resource.actions)).toBe(true);
      expect(resource.actions.length).toBeGreaterThan(0);
    }
  });

  it('time resource has expected actions in overview', () => {
    const result = handleSchemaOverview();
    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);

    const timeResource = data.resources.find((r: { resource: string }) => r.resource === 'time');
    expect(timeResource).toBeDefined();
    expect(timeResource.actions).toEqual(['list', 'get', 'create', 'update', 'delete']);
  });
});
