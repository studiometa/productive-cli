import { describe, expect, it, vi } from 'vitest';

import { createScript, defineMeta } from './helpers.js';

describe('defineMeta', () => {
  it('returns the meta object unchanged', () => {
    const meta = { name: 'Test', description: 'A test script', usage: '--flag' };
    expect(defineMeta(meta)).toBe(meta);
  });

  it('accepts a partial meta object', () => {
    const meta = { name: 'Minimal' };
    expect(defineMeta(meta)).toStrictEqual({ name: 'Minimal' });
  });

  it('accepts an empty object', () => {
    expect(defineMeta({})).toStrictEqual({});
  });
});

describe('createScript', () => {
  it('returns the function unchanged', () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    expect(createScript(fn)).toBe(fn);
  });

  it('returns a callable function that forwards ctx and resolves', async () => {
    const received: unknown[] = [];
    const fn = createScript(async (ctx) => {
      received.push(ctx);
    });

    const fakeCtx = { client: {}, output: {}, args: [], flags: {} } as never;
    await fn(fakeCtx);
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(fakeCtx);
  });
});
