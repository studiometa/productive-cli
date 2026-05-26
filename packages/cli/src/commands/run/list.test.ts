import { describe, expect, it, vi } from 'vitest';

import { discoverScripts, extractMetaFromSource, printScriptList } from './list.js';

// ── extractMetaFromSource ─────────────────────────────────────────────────────

describe('extractMetaFromSource', () => {
  it('returns an empty object when no meta export is present', () => {
    expect(extractMetaFromSource('export default function() {}')).toEqual({});
  });

  it('extracts name, description, and usage from a meta export', () => {
    const source = `
export const meta = {
  name: 'Weekly Report',
  description: 'Summarise time entries for the past week.',
  usage: '--from <date> --to <date>',
};
`;
    expect(extractMetaFromSource(source)).toEqual({
      name: 'Weekly Report',
      description: 'Summarise time entries for the past week.',
      usage: '--from <date> --to <date>',
    });
  });

  it('extracts partial meta (only name)', () => {
    const source = `export const meta = { name: 'My Script' };`;
    expect(extractMetaFromSource(source)).toEqual({ name: 'My Script' });
  });

  it('handles double-quoted strings', () => {
    const source = `export const meta = { name: "My Script", description: "Does things" };`;
    expect(extractMetaFromSource(source)).toEqual({
      name: 'My Script',
      description: 'Does things',
    });
  });

  it('handles backtick strings', () => {
    const source = 'export const meta = { name: `My Script` };';
    expect(extractMetaFromSource(source)).toEqual({ name: 'My Script' });
  });

  it('handles a ScriptMeta type annotation', () => {
    const source = `export const meta: ScriptMeta = { name: 'Typed Script' };`;
    expect(extractMetaFromSource(source)).toEqual({ name: 'Typed Script' });
  });

  it('ignores unknown keys', () => {
    const source = `export const meta = { name: 'X', author: 'Me' };`;
    const result = extractMetaFromSource(source);
    expect(result).toEqual({ name: 'X' });
    expect('author' in result).toBe(false);
  });
});

// ── discoverScripts ───────────────────────────────────────────────────────────

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

describe('discoverScripts', () => {
  it('returns an empty array when the directory does not exist', async () => {
    const { readdir } = await import('node:fs/promises');
    vi.mocked(readdir).mockRejectedValue(new Error('ENOENT'));

    const result = await discoverScripts('/nonexistent');
    expect(result).toEqual([]);
  });

  it('skips non-script files (e.g. README.md)', async () => {
    const { readdir, readFile } = await import('node:fs/promises');
    vi.mocked(readdir).mockResolvedValue(['README.md', 'package.json'] as never);
    vi.mocked(readFile).mockResolvedValue('');

    const result = await discoverScripts('/scripts');
    expect(result).toHaveLength(0);
  });

  it('discovers .ts, .mts, .js, .mjs files', async () => {
    const { readdir, readFile } = await import('node:fs/promises');
    vi.mocked(readdir).mockResolvedValue(['a.ts', 'b.mts', 'c.js', 'd.mjs', 'e.txt'] as never);
    vi.mocked(readFile).mockResolvedValue('');

    const result = await discoverScripts('/scripts');
    expect(result).toHaveLength(4);
    expect(result.map((s) => s.path)).toEqual([
      '/scripts/a.ts',
      '/scripts/b.mts',
      '/scripts/c.js',
      '/scripts/d.mjs',
    ]);
  });

  it('extracts meta from script source', async () => {
    const { readdir, readFile } = await import('node:fs/promises');
    vi.mocked(readdir).mockResolvedValue(['report.ts'] as never);
    vi.mocked(readFile).mockResolvedValue(
      "export const meta = { name: 'Report', description: 'Weekly report' };" as never,
    );

    const result = await discoverScripts('/scripts');
    expect(result[0].meta).toEqual({ name: 'Report', description: 'Weekly report' });
  });

  it('returns empty meta for scripts without a meta export', async () => {
    const { readdir, readFile } = await import('node:fs/promises');
    vi.mocked(readdir).mockResolvedValue(['plain.ts'] as never);
    vi.mocked(readFile).mockResolvedValue('const x = 1;' as never);

    const result = await discoverScripts('/scripts');
    expect(result[0].meta).toEqual({});
  });
});

// ── printScriptList ───────────────────────────────────────────────────────────

describe('printScriptList', () => {
  it('prints a no-scripts message when the list is empty', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printScriptList([], '/scripts');
    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('No scripts found');
    logSpy.mockRestore();
  });

  it('prints a header with count and each script', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printScriptList(
      [
        {
          path: '/scripts/report.ts',
          relativePath: 'scripts/report.ts',
          meta: { name: 'Weekly Report', description: 'Generates a report' },
        },
      ],
      '/scripts',
    );
    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('1 found');
    expect(output).toContain('Weekly Report');
    expect(output).toContain('scripts/report.ts');
    expect(output).toContain('Generates a report');
    logSpy.mockRestore();
  });

  it('prints usage with meta.usage when available', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printScriptList(
      [
        {
          path: '/scripts/export.ts',
          relativePath: 'scripts/export.ts',
          meta: { usage: '--from <date> --to <date>' },
        },
      ],
      '/scripts',
    );
    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('--from <date> --to <date>');
    logSpy.mockRestore();
  });
});
