import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileCache, getCache, resetCache, disableCache } from '../cache.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

describe('FileCache', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = join(tmpdir(), 'productive-cli-cache-test-' + Date.now());
    process.env.XDG_CACHE_HOME = tempDir;
    resetCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetCache();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create cache directory', () => {
    const cache = new FileCache(true);
    cache.set('/test', {}, 'org-1', { data: 'test' });
    expect(existsSync(join(tempDir, 'productive-cli', 'queries'))).toBe(true);
  });

  it('should store and retrieve data', () => {
    const cache = new FileCache(true);
    const testData = { items: [1, 2, 3] };
    
    cache.set('/projects', { page: 1 }, 'org-1', testData);
    const retrieved = cache.get('/projects', { page: 1 }, 'org-1');
    
    expect(retrieved).toEqual(testData);
  });

  it('should return null for non-existent cache', () => {
    const cache = new FileCache(true);
    const result = cache.get('/projects', {}, 'org-1');
    expect(result).toBeNull();
  });

  it('should return different data for different params', () => {
    const cache = new FileCache(true);
    const data1 = { page: 1 };
    const data2 = { page: 2 };
    
    cache.set('/projects', { page: '1' }, 'org-1', data1);
    cache.set('/projects', { page: '2' }, 'org-1', data2);
    
    expect(cache.get('/projects', { page: '1' }, 'org-1')).toEqual(data1);
    expect(cache.get('/projects', { page: '2' }, 'org-1')).toEqual(data2);
  });

  it('should return different data for different orgs', () => {
    const cache = new FileCache(true);
    const data1 = { org: 1 };
    const data2 = { org: 2 };
    
    cache.set('/projects', {}, 'org-1', data1);
    cache.set('/projects', {}, 'org-2', data2);
    
    expect(cache.get('/projects', {}, 'org-1')).toEqual(data1);
    expect(cache.get('/projects', {}, 'org-2')).toEqual(data2);
  });

  it('should invalidate by pattern', () => {
    const cache = new FileCache(true);
    
    cache.set('/projects', {}, 'org-1', { type: 'projects' });
    cache.set('/time_entries', {}, 'org-1', { type: 'time' });
    
    cache.invalidate('projects');
    
    expect(cache.get('/projects', {}, 'org-1')).toBeNull();
    expect(cache.get('/time_entries', {}, 'org-1')).toEqual({ type: 'time' });
  });

  it('should clear all cache', () => {
    const cache = new FileCache(true);
    
    cache.set('/projects', {}, 'org-1', { type: 'projects' });
    cache.set('/time_entries', {}, 'org-1', { type: 'time' });
    
    cache.clear();
    
    expect(cache.get('/projects', {}, 'org-1')).toBeNull();
    expect(cache.get('/time_entries', {}, 'org-1')).toBeNull();
  });

  it('should report stats', () => {
    const cache = new FileCache(true);
    
    cache.set('/projects', {}, 'org-1', { data: 'test' });
    cache.set('/time_entries', {}, 'org-1', { data: 'test2' });
    
    const stats = cache.stats();
    
    expect(stats.entries).toBe(2);
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.oldestAge).toBeGreaterThanOrEqual(0);
  });

  it('should not cache when disabled', () => {
    const cache = new FileCache(false);
    
    cache.set('/projects', {}, 'org-1', { data: 'test' });
    const result = cache.get('/projects', {}, 'org-1');
    
    expect(result).toBeNull();
  });

  it('should expire entries after TTL', async () => {
    const cache = new FileCache(true);
    
    // Set with 1 second TTL
    cache.set('/projects', {}, 'org-1', { data: 'test' }, { ttl: 1 });
    
    // Should exist immediately
    expect(cache.get('/projects', {}, 'org-1')).toEqual({ data: 'test' });
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Should be expired
    expect(cache.get('/projects', {}, 'org-1')).toBeNull();
  });
});

describe('Cache singleton', () => {
  beforeEach(() => {
    resetCache();
  });

  afterEach(() => {
    resetCache();
  });

  it('should return same instance', () => {
    const cache1 = getCache();
    const cache2 = getCache();
    expect(cache1).toBe(cache2);
  });

  it('should disable cache', () => {
    disableCache();
    const cache = getCache();
    cache.set('/test', {}, 'org', { data: 'test' });
    expect(cache.get('/test', {}, 'org')).toBeNull();
  });

  it('should reset singleton', () => {
    const cache1 = getCache();
    resetCache();
    const cache2 = getCache();
    expect(cache1).not.toBe(cache2);
  });
});
