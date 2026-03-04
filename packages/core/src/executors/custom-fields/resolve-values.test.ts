import { describe, expect, it, vi } from 'vitest';

import { createTestExecutorContext } from '../../context/test-utils.js';
import { resolveCustomFieldValues } from './resolve-values.js';

function makeDefinition(id: string, name: string, dataType: number) {
  return {
    id,
    type: 'custom_fields' as const,
    attributes: {
      name,
      data_type_id: dataType,
      customizable_type: 'Task',
      archived: false,
      required: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };
}

function makeOption(id: string, value: string) {
  return {
    id,
    type: 'custom_field_options' as const,
    attributes: { value, archived: false },
  };
}

describe('resolveCustomFieldValues', () => {
  it('resolves select fields with option IDs', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({
      data: [makeDefinition('42236', 'Semaine', 3)],
    });
    const getCustomFieldOptions = vi.fn().mockResolvedValue({
      data: [makeOption('417421', '2026-09 (23 février-01 mars)')],
    });
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues({ '42236': '417421' }, 'Task', ctx);

    expect(result.resolved).toEqual({ Semaine: '2026-09 (23 février-01 mars)' });
    expect(result.raw).toEqual({ '42236': '417421' });
  });

  it('resolves multi-select fields with array of option IDs', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({
      data: [makeDefinition('100', 'Tags', 5)],
    });
    const getCustomFieldOptions = vi.fn().mockResolvedValue({
      data: [makeOption('1', 'Frontend'), makeOption('2', 'Backend')],
    });
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues({ '100': ['1', '2'] }, 'Task', ctx);

    expect(result.resolved).toEqual({ Tags: ['Frontend', 'Backend'] });
  });

  it('passes through text fields without option resolution', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({
      data: [makeDefinition('200', 'Notes', 1)],
    });
    const getCustomFieldOptions = vi.fn();
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues({ '200': 'Some notes' }, 'Task', ctx);

    expect(result.resolved).toEqual({ Notes: 'Some notes' });
    // Should not call getCustomFieldOptions for text fields
    expect(getCustomFieldOptions).not.toHaveBeenCalled();
  });

  it('passes through number fields', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({
      data: [makeDefinition('300', 'Points', 2)],
    });
    const getCustomFieldOptions = vi.fn();
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues({ '300': 5 }, 'Task', ctx);

    expect(result.resolved).toEqual({ Points: 5 });
    expect(getCustomFieldOptions).not.toHaveBeenCalled();
  });

  it('passes through date fields', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({
      data: [makeDefinition('400', 'Deadline', 4)],
    });
    const getCustomFieldOptions = vi.fn();
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues({ '400': '2026-03-15' }, 'Task', ctx);

    expect(result.resolved).toEqual({ Deadline: '2026-03-15' });
    expect(getCustomFieldOptions).not.toHaveBeenCalled();
  });

  it('uses field ID as name when definition is not found', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({ data: [] });
    const getCustomFieldOptions = vi.fn();
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues({ '999': 'unknown' }, 'Task', ctx);

    expect(result.resolved).toEqual({ '999': 'unknown' });
  });

  it('uses raw option ID when option is not found', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({
      data: [makeDefinition('42236', 'Semaine', 3)],
    });
    const getCustomFieldOptions = vi.fn().mockResolvedValue({ data: [] });
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues({ '42236': '999999' }, 'Task', ctx);

    expect(result.resolved).toEqual({ Semaine: '999999' });
  });

  it('returns empty resolved for empty hash', async () => {
    const ctx = createTestExecutorContext();

    const result = await resolveCustomFieldValues({}, 'Task', ctx);

    expect(result.resolved).toEqual({});
    expect(result.raw).toEqual({});
  });

  it('returns empty resolved for null-like hash', async () => {
    const ctx = createTestExecutorContext();

    const result = await resolveCustomFieldValues(
      null as unknown as Record<string, unknown>,
      'Task',
      ctx,
    );

    expect(result.resolved).toEqual({});
  });

  it('resolves mixed field types in one call', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({
      data: [
        makeDefinition('1', 'Semaine', 3),
        makeDefinition('2', 'Points', 2),
        makeDefinition('3', 'Tags', 5),
      ],
    });
    const getCustomFieldOptions = vi.fn().mockResolvedValue({
      data: [makeOption('100', 'S09'), makeOption('200', 'Frontend'), makeOption('201', 'Backend')],
    });
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues(
      { '1': '100', '2': 42, '3': ['200', '201'] },
      'Task',
      ctx,
    );

    expect(result.resolved).toEqual({
      Semaine: 'S09',
      Points: 42,
      Tags: ['Frontend', 'Backend'],
    });
  });

  it('handles non-string values in multi-select arrays', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({
      data: [makeDefinition('1', 'Tags', 5)],
    });
    const getCustomFieldOptions = vi.fn().mockResolvedValue({ data: [] });
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues({ '1': [42, 'abc'] }, 'Task', ctx);

    // Non-string values are passed through, string values that don't resolve use raw ID
    expect(result.resolved.Tags).toEqual([42, 'abc']);
  });

  it('handles select field with non-string value', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({
      data: [makeDefinition('1', 'Status', 3)],
    });
    const getCustomFieldOptions = vi.fn();
    const ctx = createTestExecutorContext({ api: { getCustomFields, getCustomFieldOptions } });

    const result = await resolveCustomFieldValues({ '1': 42 }, 'Task', ctx);

    // Non-string value on select field — passed through
    expect(result.resolved.Status).toBe(42);
  });

  it('filters definitions by customizable_type', async () => {
    const getCustomFields = vi.fn().mockResolvedValue({ data: [] });
    const ctx = createTestExecutorContext({ api: { getCustomFields } });

    await resolveCustomFieldValues({ '1': 'val' }, 'Deal', ctx);

    expect(getCustomFields).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { customizable_type: 'Deal' },
      }),
    );
  });
});
