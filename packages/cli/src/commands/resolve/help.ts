/**
 * Help text for resolve command
 */

import { colors } from '../../utils/colors.js';

export function showResolveHelp(subcommand?: string): void {
  if (subcommand === 'detect') {
    console.log(`
${colors.bold('productive resolve detect')} - Detect resource type from query pattern

${colors.bold('USAGE:')}
  productive resolve detect <query> [options]

${colors.bold('ARGUMENTS:')}
  <query>              Query string to analyze

${colors.bold('OPTIONS:')}
  -f, --format <fmt>   Output format: human, json (default: human)
  --no-color           Disable colored output

${colors.bold('EXAMPLES:')}
  productive resolve detect "user@example.com"
  productive resolve detect "PRJ-123"
  productive resolve detect "John Doe"
`);
    return;
  }

  console.log(`
${colors.bold('productive resolve')} - Resolve human-friendly identifiers to resource IDs

${colors.bold('USAGE:')}
  productive resolve <query> [options]

${colors.bold('DESCRIPTION:')}
  Resolve a human-friendly identifier (email, name, project number) to a
  resource ID. Use this to find IDs for use in other commands.

${colors.bold('ARGUMENTS:')}
  <query>              Search query (email, name, project number, etc.)

${colors.bold('OPTIONS:')}
  -t, --type <type>    Resource type: person, project, company, deal, service
  --project <id>       Project context (required for service resolution)
  --first              Return first match if multiple results
  -q, --quiet          Output only the ID (fails on multiple matches unless --first)
  -f, --format <fmt>   Output format: human, json (default: human)
  --no-color           Disable colored output

${colors.bold('AUTO-DETECTION:')}
  The following patterns are auto-detected:

  • Email (user@example.com)     → person
  • Project number (PRJ-123)     → project
  • Deal number (D-123, DEAL-*)  → deal
  • Numeric ID (123456)          → passthrough (no resolution)
  • Other strings                → requires --type

${colors.bold('SUBCOMMANDS:')}
  detect <query>       Detect resource type from query pattern

${colors.bold('EXAMPLES:')}
  # Resolve person by email
  productive resolve "user@example.com"

  # Resolve project by number
  productive resolve "PRJ-123"
  productive resolve "P-001"

  # Search for a project by name
  productive resolve "Client" --type project

  # Search for a person by name
  productive resolve "John" --type person

  # Get first match when multiple results
  productive resolve "Meta" --type company --first

  # Get just the ID (for scripts/subshells)
  productive resolve "user@example.com" -q

  # Resolve a service within a project
  productive resolve "Development" --type service --project 777332

  # Use with subshell in other commands
  productive tasks list --assignee $(productive resolve "user@example.com" -q)
  productive time list --project $(productive resolve "PRJ-001" -q)

${colors.bold('OUTPUT (json format):')}
  {
    "query": "user@example.com",
    "matches": [
      {
        "id": "500521",
        "type": "person",
        "label": "John Doe",
        "query": "user@example.com",
        "exact": true
      }
    ],
    "exact": true
  }
`);
}
