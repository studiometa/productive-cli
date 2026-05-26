import { describe, expect, it } from 'vitest';

import { parseScriptArgs } from './args.js';

// ── positionals ──────────────────────────────────────────────────────────────

describe('positionals', () => {
  it('returns an empty result for an empty argv', () => {
    expect(parseScriptArgs([])).toEqual({ args: [], flags: {} });
  });

  it('collects bare strings as positional args', () => {
    expect(parseScriptArgs(['a', 'b', 'c'])).toEqual({ args: ['a', 'b', 'c'], flags: {} });
  });

  it('treats negative numbers as positionals, not flags', () => {
    // -1 is a negative number, not a short flag
    expect(parseScriptArgs(['-1'])).toEqual({ args: ['-1'], flags: {} });
    expect(parseScriptArgs(['-3.14'])).toEqual({ args: ['-3.14'], flags: {} });
    expect(parseScriptArgs(['-1', '-3.14'])).toEqual({ args: ['-1', '-3.14'], flags: {} });
  });
});

// ── long flags ───────────────────────────────────────────────────────────────

describe('long flags', () => {
  it('parses --flag as a boolean true', () => {
    expect(parseScriptArgs(['--mine'])).toEqual({ args: [], flags: { mine: true } });
  });

  it('parses --flag value as a string', () => {
    expect(parseScriptArgs(['--from', '2025-01-01'])).toEqual({
      args: [],
      flags: { from: '2025-01-01' },
    });
  });

  it('parses --flag=value (equals syntax)', () => {
    expect(parseScriptArgs(['--from=2025-01-01'])).toEqual({
      args: [],
      flags: { from: '2025-01-01' },
    });
  });

  it('parses --no-flag as boolean false', () => {
    expect(parseScriptArgs(['--no-cache'])).toEqual({ args: [], flags: { cache: false } });
  });

  it('treats the next token as boolean when it looks like a flag', () => {
    expect(parseScriptArgs(['--verbose', '--mine'])).toEqual({
      args: [],
      flags: { verbose: true, mine: true },
    });
  });

  it('consumes the next non-flag token as the flag value (schemaless)', () => {
    // --mine extra → mine='extra' (not mine=true, extra=positional)
    // To make mine a boolean, use --mine --other or place positionals before flags
    expect(parseScriptArgs(['--from', '2025-01-01', '--mine', 'extra'])).toEqual({
      args: [],
      flags: { from: '2025-01-01', mine: 'extra' },
    });
  });

  it('makes a flag boolean when followed by another flag', () => {
    expect(parseScriptArgs(['--mine', '--from', '2025-01-01'])).toEqual({
      args: [],
      flags: { mine: true, from: '2025-01-01' },
    });
  });

  it('mixes flags and positionals (via -- separator)', () => {
    expect(parseScriptArgs(['--from', '2025-01-01', '--', 'extra'])).toEqual({
      args: ['extra'],
      flags: { from: '2025-01-01' },
    });
  });
});

// ── short flags ──────────────────────────────────────────────────────────────

describe('short flags', () => {
  it('parses -f as boolean true', () => {
    expect(parseScriptArgs(['-f'])).toEqual({ args: [], flags: { f: true } });
  });

  it('parses -f value as a string', () => {
    expect(parseScriptArgs(['-f', 'json'])).toEqual({ args: [], flags: { f: 'json' } });
  });

  it('treats -f followed by another flag as boolean', () => {
    expect(parseScriptArgs(['-f', '--other'])).toEqual({
      args: [],
      flags: { f: true, other: true },
    });
  });

  it('ignores multi-char short flags (not -f form) as positionals', () => {
    // -abc is not a recognised short flag pattern — treated as positional
    expect(parseScriptArgs(['-abc'])).toEqual({ args: ['-abc'], flags: {} });
  });
});

// ── repeated flags (arrays) ──────────────────────────────────────────────────

describe('repeated flags', () => {
  it('promotes a flag to an array on second occurrence', () => {
    expect(parseScriptArgs(['--tag', 'a', '--tag', 'b'])).toEqual({
      args: [],
      flags: { tag: ['a', 'b'] },
    });
  });

  it('keeps appending to the array on further occurrences', () => {
    expect(parseScriptArgs(['--tag', 'a', '--tag', 'b', '--tag', 'c'])).toEqual({
      args: [],
      flags: { tag: ['a', 'b', 'c'] },
    });
  });

  it('promotes boolean flags to array when repeated', () => {
    expect(parseScriptArgs(['--verbose', '--verbose'])).toEqual({
      args: [],
      flags: { verbose: ['true', 'true'] },
    });
  });
});

// ── end-of-flags separator ───────────────────────────────────────────────────

describe('-- separator', () => {
  it('treats everything after -- as positionals', () => {
    expect(parseScriptArgs(['--flag', '--', '--not-a-flag', 'value'])).toEqual({
      args: ['--not-a-flag', 'value'],
      flags: { flag: true },
    });
  });

  it('works with only -- in argv', () => {
    expect(parseScriptArgs(['--'])).toEqual({ args: [], flags: {} });
  });

  it('collects all post-separator tokens as positionals', () => {
    expect(parseScriptArgs(['a', '--', 'b', 'c'])).toEqual({
      args: ['a', 'b', 'c'],
      flags: {},
    });
  });
});

// ── combined scenarios ────────────────────────────────────────────────────────

describe('combined', () => {
  it('handles a realistic script invocation', () => {
    // All non-flag tokens adjacent to a flag are consumed as its value.
    // Use -- to force remaining tokens to be positionals.
    const result = parseScriptArgs([
      '--from',
      '2025-01-01',
      '--to',
      '2025-01-31',
      '--mine',
      '--',
      'extra-arg',
    ]);
    expect(result).toEqual({
      args: ['extra-arg'],
      flags: { from: '2025-01-01', to: '2025-01-31', mine: true },
    });
  });

  it('consumes non-flag tokens as values in a realistic invocation', () => {
    const result = parseScriptArgs([
      '--from',
      '2025-01-01',
      '--to',
      '2025-01-31',
      '--mine',
      'extra-arg',
    ]);
    expect(result).toEqual({
      args: [],
      flags: { from: '2025-01-01', to: '2025-01-31', mine: 'extra-arg' },
    });
  });

  it('handles mixed short and long flags', () => {
    const result = parseScriptArgs(['-f', 'json', '--from', '2025-01-01']);
    expect(result).toEqual({
      args: [],
      flags: { f: 'json', from: '2025-01-01' },
    });
  });
});
