# Notes: MCP API Tools Research

## Sources

### Productive OpenAPI reference

- URL: https://developer.productive.io/reference/download_spec
- Format: OpenAPI 3.1 YAML
- Observations:
  - Contains 352 paths in the downloaded spec during initial inspection.
  - Paths are prefixed with `/api/v2`, e.g. `/api/v2/invoices`.
  - Includes endpoints such as:
    - `/api/v2/invoices`
    - `/api/v2/reports/invoice_reports`
    - `/api/v2/custom_fields`
    - `/api/v2/custom_field_options`
    - `/api/v2/companies`
  - Filters are described with `style: deepObject`.
  - Filter schemas include simple conditions and advanced logical groups.

### Current CLI raw API support

- File: `packages/cli/src/commands/api.ts`
- Current capabilities:
  - Raw authenticated API requests.
  - GET/POST/PATCH/PUT/DELETE.
  - `--filter key=value` to generate `filter[key]=value`.
  - `--include resources`.
  - `--paginate`.
  - Custom headers.
- Limitations for MCP feature:
  - CLI accepts custom headers; MCP raw API tools should not.
  - CLI does not validate paths/filters against OpenAPI reference.
  - CLI does not expose endpoint docs/discovery.

### Current MCP reports support

- File: `packages/mcp/src/handlers/reports.ts`
- Current capabilities:
  - `resource=reports`, `action=get`.
  - Basic report type, group, pagination, date/entity filters.
  - Raw additional filters.
- Limitations:
  - No CSV export.
  - No field selection.
  - No automatic all-page export.
  - No human-friendly custom field filtering.
  - No validation against Productive's official report filter schema.

## OpenAPI filter findings

### Productive filter shape

Filter query parameter is a deep object:

```json
{
  "filter": {
    "company_id": "12345"
  }
}
```

serializes to:

```text
filter[company_id]=12345
```

Operator filters:

```json
{
  "filter": {
    "amount_unpaid": {
      "not_eq": 0
    }
  }
}
```

serialize to:

```text
filter[amount_unpaid][not_eq]=0
```

Logical groups:

```json
{
  "filter": {
    "$op": "and",
    "0": { "sent_status": { "eq": 2 } },
    "1": { "amount_unpaid": { "not_eq": 0 } }
  }
}
```

### Invoice report filter fields discovered in spec

For `filter_invoice_report`, fields include:

- `amount`
- `amount_credited`
- `amount_paid`
- `amount_tax`
- `amount_unpaid`
- `amount_with_tax`
- `company_id`
- `created_at`
- `custom_fields`
- `deal_id`
- `delivery_on`
- `invoice_aging`
- `invoice_state`
- `invoice_status`
- `invoice_type`
- `invoiced_on`
- `number`
- `paid_on`
- `pay_on`
- `payment_status`
- `project_id`
- `sent_on`
- `sent_status`
- `status`
- `tags`
- `tax_rates`

Common operators observed:

- `eq`
- `not_eq`
- `contains`
- `not_contain`

### Fields relevant to SEPA invoice workflow

For invoices or invoice reports:

- `sent_status`: integer enum `[1, 2]`; sent/unsent status.
- `status`: integer enum `[1, 2]`; same concept as sent status in invoice reports.
- `sent_on`: date string.
- `amount_unpaid`: unpaid amount in invoice currency.
- `company_id`: company/client relation.

For companies:

- `custom_fields`: hash keyed by custom field ID.

For custom fields/options:

- `custom_fields` can discover field IDs by `name` and `customizable_type`.
- `custom_field_options` can discover select option IDs by `custom_field_id`.

## Security notes

- MCP `api_read` should not accept arbitrary headers.
- MCP `api_write` should be disabled by default via `PRODUCTIVE_MCP_ENABLE_API_WRITE=true`.
- Both tools should reject absolute URLs, protocol-relative URLs, and path traversal.
- Both tools should only allow paths/methods present in the generated API reference.
- Pagination must be capped.
