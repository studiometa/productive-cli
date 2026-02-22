import { describe, it, expect, vi, afterEach } from 'vitest';

import { showActivitiesHelp } from './help.js';

describe('showActivitiesHelp', () => {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  afterEach(() => spy.mockClear());

  it('shows general help', () => {
    showActivitiesHelp();
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('productive activities');
  });

  it('shows list subcommand help', () => {
    showActivitiesHelp('list');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('productive activities list');
  });

  it('shows ls alias help (same as list)', () => {
    showActivitiesHelp('ls');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('productive activities list');
  });
});
