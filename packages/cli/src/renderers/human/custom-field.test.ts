import type { FormattedCustomField } from '@studiometa/productive-api';

import { describe, it, expect, vi, afterEach } from 'vitest';

import { HumanCustomFieldListRenderer } from './custom-field.js';

describe('HumanCustomFieldListRenderer', () => {
  const renderer = new HumanCustomFieldListRenderer();
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

  afterEach(() => spy.mockClear());

  const ctx = { noColor: true };

  const makeField = (overrides?: Partial<FormattedCustomField>): FormattedCustomField => ({
    id: '42236',
    name: 'Semaine',
    data_type: 'select',
    data_type_id: 3,
    customizable_type: 'Task',
    archived: false,
    required: true,
    ...overrides,
  });

  it('renders a list of custom fields', () => {
    renderer.render(
      {
        data: [makeField(), makeField({ id: '2', name: 'Points', data_type: 'number' })],
        meta: { page: 1, total_pages: 1, total_count: 2 },
      },
      ctx,
    );

    const output = spy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Semaine');
    expect(output).toContain('Points');
    expect(output).toContain('Page 1/1');
  });

  it('shows archived label for archived fields', () => {
    renderer.renderItem(makeField({ archived: true }), ctx);

    const output = spy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('archived');
  });

  it('shows options when present', () => {
    renderer.renderItem(
      makeField({
        options: [
          { id: '1', value: 'S09', archived: false },
          { id: '2', value: 'S10', archived: false },
          { id: '3', value: 'S11', archived: true },
        ],
      }),
      ctx,
    );

    const output = spy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('S09, S10');
    // Archived option should be filtered out
    expect(output).not.toContain('S11');
  });

  it('shows description when present', () => {
    renderer.renderItem(makeField({ description: 'Sprint week number' }), ctx);

    const output = spy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Sprint week number');
  });
});
