/**
 * MCP Server Instructions
 *
 * These instructions are sent to Claude Desktop during initialization
 * and used as context/hints for the LLM. This ensures the AI agent
 * knows how to properly use the Productive.io MCP server.
 */

export const INSTRUCTIONS = `# Productive.io MCP Server

You have access to the Productive.io API through a single unified tool.

## The \`productive\` Tool

Call with: \`productive(resource, action, [parameters...])\`

### Resources & Actions

| Resource | Actions | Description |
|----------|---------|-------------|
| projects | list, get, help | Project management |
| time | list, get, create, update, help | Time tracking |
| tasks | list, get, create, update, help | Task management |
| services | list, get, help | Budget line items |
| people | list, get, me, help | Team members |
| companies | list, get, create, update, help | Client companies |
| comments | list, get, create, update, help | Comments on tasks/deals |
| timers | list, get, start, stop, help | Active timers |
| deals | list, get, create, update, help | Sales deals |
| bookings | list, get, create, update, help | Resource scheduling |
| reports | get, help | Generate reports |

### Getting Help

Use \`action: "help"\` to get detailed documentation:
\`\`\`json
{ "resource": "time", "action": "help" }
\`\`\`

### Common Parameters

- \`resource\` (required): Resource type
- \`action\` (required): Action to perform
- \`id\`: Resource ID (for get, update, stop)
- \`filter\`: Filter object for list actions
- \`page\`, \`per_page\`: Pagination
- \`compact\`: true for minimal output (default for list), false for full details
- \`include\`: Array of related resources to fetch
- \`query\`: Text search on name/title fields

### Time Values

**Time is always in MINUTES:**
- 60 = 1 hour
- 480 = 8 hours (full day)
- 240 = 4 hours (half day)

### Examples

List projects:
\`\`\`json
{ "resource": "projects", "action": "list" }
\`\`\`

Get current user:
\`\`\`json
{ "resource": "people", "action": "me" }
\`\`\`

Create time entry (2 hours):
\`\`\`json
{
  "resource": "time",
  "action": "create",
  "service_id": "12345",
  "date": "2024-01-16",
  "time": 120,
  "note": "Development work"
}
\`\`\`

List tasks with filters:
\`\`\`json
{
  "resource": "tasks",
  "action": "list",
  "filter": { "project_id": "12345", "status": "open" }
}
\`\`\`

### Filters Reference

**Time entries:** person_id, project_id, service_id, after, before (dates YYYY-MM-DD)
**Tasks:** project_id, assignee_id, status (open/closed/all), task_list_id
**Projects:** company_id, archived (true/false)
**Services:** project_id, deal_id

## Best Practices

1. **Never modify text content** - Use exact titles, descriptions, notes from API responses. Do not rephrase or "improve" user content.

2. **Never invent IDs** - Always fetch resources first to get valid IDs. Don't guess project_id, service_id, etc.

3. **Always confirm before mutations** - Ask user confirmation before create, update, or delete operations.

4. **Use help action** - When unsure about a resource, use \`action: "help"\` first.

5. **Use people.me first** - Get current user's ID before filtering by person.

6. **Use include** - Fetch related data in one request instead of multiple calls.
`;
