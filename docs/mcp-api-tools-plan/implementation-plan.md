# Implementation Plan: MCP `api_read` and `api_write` Tools

## Feature Goal

Add two secure MCP tools for raw Productive API access:

```text
api_read
api_write
```

The tools must be well documented, validate paths/filters/query params against Productive's official OpenAPI reference, and provide safe defaults for agents.

Official reference source:

```text
https://developer.productive.io/reference/download_spec
```

## Tool Design

### `api_read`

Read-only Productive API access.

Example:

```json
{
  "path": "/invoices",
  "filter": {
    "sent_status": { "eq": 2 },
    "sent_on": { "contains": "2026-04" },
    "amount_unpaid": { "not_eq": 0 }
  },
  "include": ["company"],
  "sort": ["-sent_on"],
  "per_page": 200,
  "paginate": true,
  "max_pages": 20
}
```

Docs mode:

```json
{
  "path": "/reports/invoice_reports",
  "describe": true
}
```

Docs mode should return:

- endpoint summary,
- supported methods,
- supported query params,
- supported filters,
- supported filter operators,
- supported sort fields,
- examples.

### `api_write`

Raw write access for documented Productive endpoints.

Example:

```json
{
  "method": "PATCH",
  "path": "/tasks/123",
  "body": {
    "data": {
      "type": "tasks",
      "id": "123",
      "attributes": {
        "title": "Updated title"
      }
    }
  },
  "confirm": true
}
```

Writes must be disabled unless:

```bash
PRODUCTIVE_MCP_ENABLE_API_WRITE=true
```

`api_write` must also require:

```json
{ "confirm": true }
```

Optional dry-run mode:

```json
{
  "method": "PATCH",
  "path": "/tasks/123",
  "body": {},
  "dry_run": true
}
```

This returns the normalized request without executing it.

## Productive Filter Syntax to Support

### Simple filters

Input:

```json
{
  "filter": {
    "company_id": "12345"
  }
}
```

Serialized query:

```text
filter[company_id]=12345
```

### Operator filters

Input:

```json
{
  "filter": {
    "amount_unpaid": {
      "not_eq": 0
    }
  }
}
```

Serialized query:

```text
filter[amount_unpaid][not_eq]=0
```

### Logical groups

Input:

```json
{
  "filter": {
    "$op": "and",
    "0": {
      "sent_status": { "eq": 2 }
    },
    "1": {
      "amount_unpaid": { "not_eq": 0 }
    }
  }
}
```

Should serialize using Productive's nested deep-object filter query format.

## Implementation Phases

### Phase 1: Productive API reference generator

Add:

```text
scripts/update-productive-api-reference.ts
packages/mcp/src/api-reference/generated.ts
packages/mcp/src/api-reference/types.ts
```

The generator should:

1. Download the OpenAPI spec.
2. Parse YAML.
3. Normalize paths from `/api/v2/...` to `/...`.
4. Extract per endpoint:
   - methods,
   - summaries,
   - query params,
   - filters,
   - filter operators,
   - filter field type/format/enum when available,
   - sort values,
   - path params,
   - whether request body is supported.
5. Write a compact generated TypeScript reference.

Example generated shape:

```ts
{
  "/invoices": {
    methods: ["GET", "POST"],
    summary: "Get invoices",
    filters: {
      sent_status: {
        operators: ["eq", "not_eq", "contains", "not_contain"],
        type: "integer",
        enum: [1, 2],
        description: "Whether this invoice has been sent..."
      },
      sent_on: {
        operators: ["eq", "not_eq", "contains", "not_contain"],
        type: "string",
        format: "date"
      }
    },
    sort: ["amount", "-amount", "sent_on", "-sent_on"]
  }
}
```

Add npm scripts:

```json
{
  "api-reference:update": "tsx scripts/update-productive-api-reference.ts",
  "api-reference:check": "tsx scripts/update-productive-api-reference.ts --check"
}
```

### Phase 2: Raw API client method

In:

```text
packages/api/src/client.ts
```

Add public method:

```ts
requestRaw<T>(path: string, options: {
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
}): Promise<T>
```

Requirements:

- Reuse existing auth headers.
- Reuse existing base URL.
- Reuse existing rate limiter and error handling.
- Do not bypass existing cache/rate-limit behavior accidentally.

Tests:

```text
packages/api/src/client.test.ts
```

Cover:

- raw GET,
- raw POST/PATCH,
- query params,
- body serialization,
- error handling.

### Phase 3: Core raw API executors

Add:

```text
packages/core/src/executors/api/read.ts
packages/core/src/executors/api/write.ts
packages/core/src/executors/api/types.ts
packages/core/src/executors/api/index.ts
```

Responsibilities:

- Call `ctx.api.requestRaw`.
- Paginate GET responses when requested.
- Preserve raw JSON response shape.
- Enforce max pages at executor level.
- Keep all dependencies injected.

Export from:

```text
packages/core/src/index.ts
```

### Phase 4: MCP API utilities and handlers

Add:

```text
packages/mcp/src/handlers/api-read.ts
packages/mcp/src/handlers/api-write.ts
packages/mcp/src/handlers/api-utils.ts
```

Responsibilities:

- Validate path.
- Normalize `/api/v2/foo` to `/foo` for user convenience.
- Reject unsafe paths.
- Validate endpoint exists in generated reference.
- Validate method is allowed for endpoint.
- Validate filters and operators.
- Validate sort fields.
- Serialize query/filter/include/sort/page params.
- Enforce pagination limits.
- Provide `describe: true` docs mode.
- Call core executors.

Update:

```text
packages/mcp/src/handlers/index.ts
packages/mcp/src/tools.ts
```

### Phase 5: Security rules

#### `api_read`

Allowed:

- GET only.
- Paths present in generated OpenAPI reference.
- Relative Productive paths only.

Rejected:

```text
https://example.com
//example.com
../foo
/%2e%2e/foo
```

No arbitrary headers.

Pagination caps:

```ts
per_page <= 200
max_pages <= 50
default max_pages = 20
```

#### `api_write`

Allowed only when:

```text
PRODUCTIVE_MCP_ENABLE_API_WRITE=true
```

and:

```json
{ "confirm": true }
```

Also:

- Method must be one of `POST`, `PATCH`, `PUT`, `DELETE`.
- Method/path must exist in OpenAPI reference.
- No arbitrary headers.
- Same path validation as `api_read`.

### Phase 6: MCP tool definitions

Add to `TOOLS` in:

```text
packages/mcp/src/tools.ts
```

`api_read` annotations:

```ts
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
}
```

`api_write` annotations:

```ts
{
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true
}
```

### Phase 7: Documentation

Update:

```text
packages/mcp/README.md
packages/mcp/skills/SKILL.md
```

Document:

- When to use `productive` vs `api_read`.
- `api_read` docs mode.
- Simple filters.
- Operator filters.
- Logical groups.
- Pagination.
- Sort and include usage.
- Write safety model.
- Endpoint validation against Productive OpenAPI.

Include examples for:

- invoices,
- invoice reports,
- companies,
- custom fields,
- custom field options.

Add a documented workflow for the SEPA invoice use case:

1. Discover custom field:

```json
{
  "path": "/custom_fields",
  "filter": {
    "customizable_type": "companies",
    "name": { "contains": "SEPA Direct Debit" }
  }
}
```

2. Discover valid option:

```json
{
  "path": "/custom_field_options",
  "filter": {
    "custom_field_id": "39932"
  }
}
```

3. Fetch invoices:

```json
{
  "path": "/invoices",
  "filter": {
    "sent_status": { "eq": 2 },
    "sent_on": { "contains": "2026-04" },
    "amount_unpaid": { "not_eq": 0 }
  },
  "per_page": 200,
  "paginate": true
}
```

4. Fetch companies or include related company when supported.
5. Join/filter locally by company custom field.

### Phase 8: Tests

#### API package

```text
packages/api/src/client.test.ts
```

Test:

- raw GET,
- raw write methods,
- query serialization,
- body serialization,
- errors.

#### Core package

```text
packages/core/src/executors/api/read.test.ts
packages/core/src/executors/api/write.test.ts
```

Test:

- dependency injection,
- pagination,
- max page limit,
- raw data preservation,
- write options.

#### MCP package

```text
packages/mcp/src/handlers/api-read.test.ts
packages/mcp/src/handlers/api-write.test.ts
packages/mcp/src/handlers/api-utils.test.ts
packages/mcp/src/tools.test.ts
```

Test:

- tool definitions,
- path sanitization,
- absolute URL rejection,
- traversal rejection,
- unknown endpoint rejection,
- invalid filter suggestions,
- invalid operator suggestions,
- docs mode,
- filter serialization,
- logical group serialization,
- pagination caps,
- write disabled by default,
- write requires `confirm: true`,
- write dry run does not execute request.

#### Generator

Use a fixture spec, not live network, in tests.

Test:

- YAML parsing,
- path normalization,
- filter extraction,
- operator extraction,
- sort extraction,
- check mode.

## Acceptance Criteria

The feature is complete when:

1. `api_read` can fetch any documented GET endpoint.
2. `api_read` can describe valid filters/query params for an endpoint.
3. Invalid filters return helpful errors with valid alternatives.
4. Invalid operators return helpful errors with valid operators.
5. Nested Productive filters serialize correctly.
6. Pagination works with safety caps.
7. `api_write` is unavailable by default.
8. `api_write` requires env enablement and confirmation.
9. Tool definitions expose correct MCP annotations.
10. Docs include filter/query examples compared against the OpenAPI reference.
11. Tests cover API, core, MCP handlers, tools, and generator behavior.
12. The earlier invoice/SEPA workflow can be performed using `api_read`.
