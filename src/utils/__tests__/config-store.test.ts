import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigStore } from '../config-store.js';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ConfigStore', () => {
  let configStore: ConfigStore<{ key1: string; key2: number; key3?: string }>;
  let testConfigPath: string;

  beforeEach(() => {
    // Use a temporary directory for testing
    const tempDir = join(tmpdir(), 'productive-cli-test-' + Date.now());
    process.env.XDG_CONFIG_HOME = tempDir;
    configStore = new ConfigStore('test-project');
    testConfigPath = join(tempDir, 'test-project', 'config.json');
  });

  afterEach(() => {
    // Clean up test config
    if (process.env.XDG_CONFIG_HOME && existsSync(process.env.XDG_CONFIG_HOME)) {
      rmSync(process.env.XDG_CONFIG_HOME, { recursive: true, force: true });
    }
  });

  it('should create config store', () => {
    expect(configStore).toBeDefined();
  });

  it('should set and get value', () => {
    configStore.set('key1', 'value1');
    expect(configStore.get('key1')).toBe('value1');
  });

  it('should set multiple values', () => {
    configStore.set('key1', 'value1');
    configStore.set('key2', 42);
    expect(configStore.get('key1')).toBe('value1');
    expect(configStore.get('key2')).toBe(42);
  });

  it('should return undefined for non-existent key', () => {
    expect(configStore.get('key3')).toBeUndefined();
  });

  it('should delete value', () => {
    configStore.set('key1', 'value1');
    configStore.delete('key1');
    expect(configStore.get('key1')).toBeUndefined();
  });

  it('should clear all values', () => {
    configStore.set('key1', 'value1');
    configStore.set('key2', 42);
    configStore.clear();
    expect(configStore.get('key1')).toBeUndefined();
    expect(configStore.get('key2')).toBeUndefined();
  });

  it('should persist values to disk', () => {
    configStore.set('key1', 'value1');
    const newStore = new ConfigStore<{ key1: string }>('test-project');
    expect(newStore.get('key1')).toBe('value1');
  });

  it('should get entire store', () => {
    configStore.set('key1', 'value1');
    configStore.set('key2', 42);
    const store = configStore.store;
    expect(store).toEqual({ key1: 'value1', key2: 42 });
  });

  it('should create config directory if not exists', () => {
    configStore.set('key1', 'value1');
    expect(existsSync(testConfigPath)).toBe(true);
  });

  it('should handle empty store', () => {
    const store = configStore.store;
    expect(store).toEqual({});
  });
});
