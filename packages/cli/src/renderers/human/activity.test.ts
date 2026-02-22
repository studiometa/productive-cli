import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createRenderContext } from '../types.js';
import { HumanActivityListRenderer } from './activity.js';

describe('HumanActivityListRenderer', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  const ctx = createRenderContext({ noColor: true });

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const renderer = new HumanActivityListRenderer();

  it('renders activity with creator and changeset', () => {
    renderer.render(
      {
        data: [
          {
            id: '1',
            event: 'create',
            changeset: "name: null → 'New Project'",
            created_at: '2026-02-22T10:30:00Z',
            creator_name: 'John Doe',
          },
        ],
      },
      ctx,
    );

    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('create');
    expect(output).toContain('John Doe');
    expect(output).toContain("name: null → 'New Project'");
  });

  it('renders activity without creator', () => {
    renderer.renderItem(
      {
        id: '2',
        event: 'delete',
        changeset: '',
        created_at: '2026-02-22T11:00:00Z',
      },
      ctx,
    );

    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('delete');
    // No "by" prefix when no creator
    expect(output).not.toContain(' by ');
  });

  it('renders pagination', () => {
    renderer.renderPagination({ page: 2, total_pages: 5, total_count: 100 }, ctx);

    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('2/5');
    expect(output).toContain('100');
  });

  it('renders empty list without errors', () => {
    expect(() => renderer.render({ data: [] }, ctx)).not.toThrow();
  });
});
