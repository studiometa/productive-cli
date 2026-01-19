import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  endpoint: string;
  params: Record<string, unknown>;
}

interface CacheOptions {
  ttl?: number; // TTL in seconds
  enabled?: boolean;
}

// Default TTLs by endpoint pattern (in seconds)
const DEFAULT_TTLS: Record<string, number> = {
  '/projects': 3600,      // 1 hour
  '/people': 3600,        // 1 hour
  '/services': 3600,      // 1 hour
  '/time_entries': 300,   // 5 minutes
  '/tasks': 900,          // 15 minutes
  '/budgets': 900,        // 15 minutes
};

const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_CACHE_ENTRIES = 1000;

export class FileCache {
  private cacheDir: string;
  private enabled: boolean;

  constructor(enabled = true) {
    const cacheBase = process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
    this.cacheDir = join(cacheBase, 'productive-cli', 'queries');
    this.enabled = enabled;
    
    if (this.enabled) {
      this.ensureCacheDir();
    }
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a cache key from endpoint and params
   */
  private getCacheKey(endpoint: string, params: Record<string, unknown>, orgId: string): string {
    // Sort params keys for consistent hashing
    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, unknown>);
    
    const normalized = JSON.stringify({ endpoint, orgId, params: sortedParams });
    return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Get the TTL for an endpoint
   */
  private getTTL(endpoint: string, customTTL?: number): number {
    if (customTTL !== undefined) return customTTL;
    
    // Find matching default TTL
    for (const [pattern, ttl] of Object.entries(DEFAULT_TTLS)) {
      if (endpoint.startsWith(pattern)) {
        return ttl;
      }
    }
    return 300; // Default 5 minutes
  }

  /**
   * Get cached data if valid
   */
  get<T>(endpoint: string, params: Record<string, unknown>, orgId: string): T | null {
    if (!this.enabled) return null;

    try {
      const key = this.getCacheKey(endpoint, params, orgId);
      const filePath = join(this.cacheDir, `${key}.json`);

      if (!existsSync(filePath)) return null;

      const content = readFileSync(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      // Check if expired
      const age = (Date.now() - entry.timestamp) / 1000;
      if (age > entry.ttl) {
        // Expired, delete file
        try { unlinkSync(filePath); } catch {}
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Store data in cache
   */
  set<T>(
    endpoint: string,
    params: Record<string, unknown>,
    orgId: string,
    data: T,
    options?: CacheOptions
  ): void {
    if (!this.enabled) return;

    try {
      const key = this.getCacheKey(endpoint, params, orgId);
      const filePath = join(this.cacheDir, `${key}.json`);
      const ttl = this.getTTL(endpoint, options?.ttl);

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        endpoint,
        params,
      };

      writeFileSync(filePath, JSON.stringify(entry));
      
      // Cleanup old entries if needed (async, don't block)
      setImmediate(() => this.cleanup());
    } catch {
      // Silently fail cache writes
    }
  }

  /**
   * Invalidate cache for an endpoint pattern
   */
  invalidate(endpointPattern?: string): void {
    if (!this.enabled) return;

    try {
      const files = readdirSync(this.cacheDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = join(this.cacheDir, file);
        
        if (!endpointPattern) {
          // Clear all
          unlinkSync(filePath);
        } else {
          // Check if matches pattern
          try {
            const content = readFileSync(filePath, 'utf-8');
            const entry: CacheEntry<unknown> = JSON.parse(content);
            if (entry.endpoint.includes(endpointPattern)) {
              unlinkSync(filePath);
            }
          } catch {
            // Invalid file, delete it
            unlinkSync(filePath);
          }
        }
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.invalidate();
  }

  /**
   * Get cache statistics
   */
  stats(): { entries: number; size: number; oldestAge: number } {
    if (!this.enabled || !existsSync(this.cacheDir)) {
      return { entries: 0, size: 0, oldestAge: 0 };
    }

    try {
      const files = readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
      let totalSize = 0;
      let oldestTimestamp = Date.now();

      for (const file of files) {
        const filePath = join(this.cacheDir, file);
        const stat = statSync(filePath);
        totalSize += stat.size;

        try {
          const content = readFileSync(filePath, 'utf-8');
          const entry: CacheEntry<unknown> = JSON.parse(content);
          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
          }
        } catch {}
      }

      return {
        entries: files.length,
        size: totalSize,
        oldestAge: Math.round((Date.now() - oldestTimestamp) / 1000),
      };
    } catch {
      return { entries: 0, size: 0, oldestAge: 0 };
    }
  }

  /**
   * Cleanup old/expired entries
   */
  private cleanup(): void {
    try {
      const files = readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
      
      // Check total size and count
      let totalSize = 0;
      const fileInfos: { path: string; timestamp: number; size: number }[] = [];

      for (const file of files) {
        const filePath = join(this.cacheDir, file);
        const stat = statSync(filePath);
        totalSize += stat.size;

        try {
          const content = readFileSync(filePath, 'utf-8');
          const entry: CacheEntry<unknown> = JSON.parse(content);
          
          // Delete expired entries
          const age = (Date.now() - entry.timestamp) / 1000;
          if (age > entry.ttl) {
            unlinkSync(filePath);
            totalSize -= stat.size;
            continue;
          }

          fileInfos.push({
            path: filePath,
            timestamp: entry.timestamp,
            size: stat.size,
          });
        } catch {
          // Invalid file, delete it
          unlinkSync(filePath);
          totalSize -= stat.size;
        }
      }

      // If still over limits, delete oldest entries
      if (totalSize > MAX_CACHE_SIZE || fileInfos.length > MAX_CACHE_ENTRIES) {
        // Sort by timestamp (oldest first)
        fileInfos.sort((a, b) => a.timestamp - b.timestamp);

        while ((totalSize > MAX_CACHE_SIZE || fileInfos.length > MAX_CACHE_ENTRIES) && fileInfos.length > 0) {
          const oldest = fileInfos.shift()!;
          try {
            unlinkSync(oldest.path);
            totalSize -= oldest.size;
          } catch {}
        }
      }
    } catch {
      // Silently fail cleanup
    }
  }
}

// Singleton instance
let cacheInstance: FileCache | null = null;

export function getCache(enabled = true): FileCache {
  if (!cacheInstance) {
    cacheInstance = new FileCache(enabled);
  }
  return cacheInstance;
}

export function disableCache(): void {
  cacheInstance = new FileCache(false);
}

export function resetCache(): void {
  cacheInstance = null;
}

export function clearCache(): void {
  getCache().clear();
}
