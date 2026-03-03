import { describe, it, expect, vi, afterEach } from 'vitest';

import { showCustomFieldsHelp } from './help.js';

describe('showCustomFieldsHelp', () => {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  afterEach(() => spy.mockClear());

  it('shows general help', () => {
    showCustomFieldsHelp();
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('productive custom-fields');
  });

  it('shows list subcommand help', () => {
    showCustomFieldsHelp('list');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('productive custom-fields list');
  });

  it('shows ls alias help (same as list)', () => {
    showCustomFieldsHelp('ls');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('productive custom-fields list');
  });

  it('shows get subcommand help', () => {
    showCustomFieldsHelp('get');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('productive custom-fields get');
  });
});
