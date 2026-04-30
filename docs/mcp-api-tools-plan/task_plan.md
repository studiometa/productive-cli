# Task Plan: MCP API Tools

## Goal

Plan the addition of two secure MCP tools, `api_read` and `api_write`, for raw Productive API access validated and documented against Productive's official OpenAPI reference.

## Phases

- [x] Phase 1: Define goal and scope
- [x] Phase 2: Research current CLI/MCP/API capabilities
- [x] Phase 3: Draft implementation plan
- [x] Phase 4: Save persistent planning files
- [ ] Phase 5: Review and refine before implementation
- [ ] Phase 6: Implement after approval

## Key Questions

1. How should raw API access be exposed safely in MCP?
2. How can filters and query parameters be documented and validated against Productive's API reference?
3. What security boundaries are needed for read vs write operations?
4. How should pagination, filter serialization, and docs/discovery mode work?

## Decisions Made

- Use two MCP tools instead of `resource=api`: `api_read` and `api_write`.
- Keep `api_read` GET-only with read-only MCP annotations.
- Keep `api_write` separate, disabled by default, and require `confirm: true`.
- Generate a compact local API reference from `https://developer.productive.io/reference/download_spec` instead of fetching it at runtime.
- Validate paths, methods, filters, sort fields, and query params against the generated reference.
- Support Productive `deepObject` filters including simple fields, operator objects, and logical groups.

## Errors Encountered

- The downloadable Productive spec is YAML, not JSON. It must be parsed with a YAML parser.
- Productive API paths in the spec include `/api/v2/...`; MCP should normalize user-facing paths to `/...`.
- The current CLI `api` command can fetch raw endpoints but does not validate filters against the spec.

## Status

**Currently in Phase 5** - Planning files have been saved. Next step is review/refinement before implementation.
