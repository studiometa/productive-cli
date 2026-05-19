# MCP API Tools Plan

This folder contains the persistent planning files for adding secure Productive API passthrough tools to the MCP server.

## Files

- [`task_plan.md`](./task_plan.md) — progress tracker and decisions.
- [`notes.md`](./notes.md) — research notes and OpenAPI findings.
- [`implementation-plan.md`](./implementation-plan.md) — full feature implementation plan.

## Scope

Add two MCP tools:

- `api_read`: GET-only, documented, spec-validated raw Productive API access.
- `api_write`: gated write access for documented Productive API endpoints.

The tools should validate and document filters/query parameters against Productive's official OpenAPI reference:

```text
https://developer.productive.io/reference/download_spec
```
