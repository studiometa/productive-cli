import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Spinner } from '../spinner.js';

describe('Spinner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create spinner with text', () => {
    const spinner = new Spinner('Loading...');
    expect(spinner).toBeDefined();
  });

  it('should start and stop', () => {
    const spinner = new Spinner('Loading...');
    spinner.start();
    expect(spinner).toBeDefined();
    spinner.stop();
  });

  it('should succeed with custom text', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const spinner = new Spinner('Loading...');
    spinner.start();
    spinner.succeed('Done!');
    consoleLogSpy.mockRestore();
  });

  it('should fail with custom text', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spinner = new Spinner('Loading...');
    spinner.start();
    spinner.fail('Error!');
    consoleErrorSpy.mockRestore();
  });

  it('should set text', () => {
    const spinner = new Spinner('Loading...');
    spinner.setText('New text');
    expect(spinner).toBeDefined();
  });

  it('should handle chaining', () => {
    const spinner = new Spinner('Loading...');
    const result = spinner.start().setText('Updated').stop();
    expect(result).toBe(spinner);
  });
});
