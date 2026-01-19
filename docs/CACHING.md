# Caching Strategy

## Overview

This document outlines the caching strategy for the Productive CLI to improve performance and reduce API calls.

## Approach: Hybrid File + SQLite Cache

### Why Hybrid?

Different data types have different characteristics:

| Data Type | Change Frequency | Best Strategy |
|-----------|------------------|---------------|
| Projects | Rarely | SQLite, 1h TTL |
| People | Rarely | SQLite, 1h TTL |
| Services | Rarely | SQLite, 1h TTL |
| Companies | Rarely | SQLite, 1h TTL |
| Time entries | Often | File cache, 5min TTL |
| Tasks | Moderate | File cache, 15min TTL |
| Budgets | Moderate | File cache, 15min TTL |

### File Cache (Simple TTL)

For frequently changing data where we just want to avoid repeated identical queries.

```
~/.cache/productive-cli/
├── queries/
│   ├── {hash}.json          # Cached response
│   └── {hash}.meta.json     # { timestamp, ttl, endpoint, params }
```

**Features:**
- Key = SHA256 hash of (endpoint + sorted params + org_id)
- Automatic cleanup of expired entries
- Max cache size limit (e.g., 50MB)
- `--no-cache` flag to bypass
- `--refresh` flag to force refresh

### SQLite Cache (Structured)

For reference data that changes rarely and benefits from local querying.

```
~/.cache/productive-cli/
└── productive.db
```

**Schema:**
```sql
-- Metadata
CREATE TABLE cache_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER
);

-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  project_number TEXT,
  archived INTEGER,
  budget REAL,
  company_id TEXT,
  data JSON,  -- Full API response
  synced_at INTEGER
);
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_company ON projects(company_id);

-- People
CREATE TABLE people (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  active INTEGER,
  company_id TEXT,
  data JSON,
  synced_at INTEGER
);
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_name ON people(first_name, last_name);

-- Services
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  name TEXT,
  project_id TEXT,
  deal_id TEXT,
  data JSON,
  synced_at INTEGER
);
CREATE INDEX idx_services_project ON services(project_id);
```

**Features:**
- Incremental sync (fetch only changed records if API supports it)
- Local search/filter without API calls
- Offline mode for read operations
- `productive cache sync` command to manually refresh
- `productive cache clear` command to reset

## CLI Flags

```
Global cache options:
  --no-cache          Bypass cache, fetch fresh data
  --refresh           Force refresh cache for this query
  --offline           Use only cached data (fail if not available)

Cache management commands:
  productive cache status    Show cache stats (size, age, entries)
  productive cache sync      Sync all reference data
  productive cache clear     Clear all cached data
  productive cache clear projects   Clear specific cache
```

## Implementation Phases

### Phase 1: Simple File Cache
- Implement hash-based file caching
- Add `--no-cache` and `--refresh` flags
- Cache time entries, tasks, budgets queries
- TTL configuration

### Phase 2: SQLite for Reference Data
- Add SQLite storage for projects, people, services
- Implement local search (e.g., `productive projects list --search "foo"`)
- Add sync command
- Background sync option

### Phase 3: Smart Features
- Cache warming on first run
- Automatic background refresh
- Offline mode
- Cache statistics and management

## Configuration

```json
// ~/.config/productive-cli/config.json
{
  "cache": {
    "enabled": true,
    "ttl": {
      "projects": 3600,
      "people": 3600,
      "services": 3600,
      "time_entries": 300,
      "tasks": 900,
      "budgets": 900
    },
    "maxSize": "50MB",
    "sqlite": {
      "enabled": true,
      "syncOnStartup": false
    }
  }
}
```

## Cache Invalidation

### Automatic Invalidation
- After any write operation (create, update, delete)
- When TTL expires
- When switching organization

### Manual Invalidation
- `productive cache clear`
- `--refresh` flag
- Config file change

## Example Usage

```bash
# First call - fetches from API, caches result
$ productive projects list
# ... results ...

# Second call within TTL - instant from cache
$ productive projects list
# ... same results, instant ...

# Force refresh
$ productive projects list --refresh
# ... fresh results from API ...

# Search locally (with SQLite cache)
$ productive projects list --search "website"
# ... filtered locally, no API call ...

# Offline mode
$ productive projects list --offline
# ... from cache or error ...

# Check cache status
$ productive cache status
Cache location: ~/.cache/productive-cli/
SQLite database: 2.3 MB
File cache: 1.1 MB (23 entries)
Reference data:
  - projects: 156 entries, synced 45 min ago
  - people: 42 entries, synced 45 min ago
  - services: 234 entries, synced 45 min ago

# Sync reference data
$ productive cache sync
Syncing projects... 156 entries
Syncing people... 42 entries
Syncing services... 234 entries
Done in 3.2s
```

## Dependencies

For SQLite, we'd use `better-sqlite3` (native, fast) or `sql.js` (pure JS, no native deps).

Recommendation: `better-sqlite3` for performance, with `sql.js` as fallback for environments where native modules are problematic.

Alternatively: Use Node.js built-in `node:sqlite` (experimental in Node 22+, stable in Node 24).

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| File cache only | Simple, no deps | No local queries |
| SQLite only | Powerful queries | More complex |
| Hybrid | Best of both | More code to maintain |
| Node.js native sqlite | No deps | Node 22+ only |

## Recommendation

Start with **Phase 1 (File Cache)** as it provides immediate benefits with minimal complexity. Then evaluate if SQLite is needed based on user feedback.

For this project, since we target Node 24+, using `node:sqlite` is a good option that avoids external dependencies.
