/**
 * Help text for activities command
 */

import { colors } from '../../utils/colors.js';

export function showActivitiesHelp(subcommand?: string): void {
  if (subcommand === 'list' || subcommand === 'ls') {
    console.log(`
${colors.bold('productive activities list')} - List activities (audit feed)

${colors.bold('USAGE:')}
  productive activities list [options]

${colors.bold('OPTIONS:')}
  --event <type>       Filter by event type: create, update, delete
  --after <timestamp>  Filter activities after ISO 8601 timestamp
  --person <id>        Filter by creator person ID
  --project <id>       Filter by project ID
  --filter <filters>   Generic filters (comma-separated key=value pairs)
  -p, --page <num>     Page number (default: 1)
  -s, --size <num>     Page size (default: 25)
  -f, --format <fmt>   Output format: json, human, csv, table

${colors.bold('EXAMPLES:')}
  productive activities list
  productive activities list --event create
  productive activities list --after 2026-02-01T00:00:00Z
  productive activities list --person 12345
  productive activities list --event update --format json
`);
  } else {
    console.log(`
${colors.bold('productive activities')} - View activity feed (read-only audit log)

${colors.bold('USAGE:')}
  productive activities <subcommand> [options]

${colors.bold('SUBCOMMANDS:')}
  list, ls            List recent activities

${colors.bold('COMMON OPTIONS:')}
  -f, --format <fmt>  Output format: json, human, csv, table
  -p, --page <num>    Page number for pagination
  -s, --size <num>    Page size (default: 25)
  -h, --help          Show help for a subcommand

${colors.bold('EXAMPLES:')}
  productive activities list
  productive activities list --event create
  productive activities ls --format json

Run ${colors.cyan('productive activities list --help')} for subcommand details.
`);
  }
}
