/**
 * Help text for custom-fields command
 */

import { colors } from '../../utils/colors.js';

export function showCustomFieldsHelp(subcommand?: string): void {
  if (subcommand === 'list' || subcommand === 'ls') {
    console.log(`
${colors.bold('productive custom-fields list')} - List custom field definitions

${colors.bold('USAGE:')}
  productive custom-fields list [options]

${colors.bold('OPTIONS:')}
  --type <type>        Filter by customizable type: Task, Deal, Company, Project, etc.
  --archived <bool>    Filter by archived status (true/false)
  --include <includes> Comma-separated includes (e.g. options)
  --filter <filters>   Generic filters (comma-separated key=value pairs)
  -p, --page <num>     Page number (default: 1)
  -s, --size <num>     Page size (default: 25)
  -f, --format <fmt>   Output format: json, human, csv, table

${colors.bold('EXAMPLES:')}
  productive custom-fields list
  productive custom-fields list --type Task
  productive custom-fields list --type Deal --format json
  productive custom-fields list --archived false
`);
  } else if (subcommand === 'get') {
    console.log(`
${colors.bold('productive custom-fields get')} - Get a custom field definition with options

${colors.bold('USAGE:')}
  productive custom-fields get <id> [options]

${colors.bold('OPTIONS:')}
  --include <includes> Comma-separated includes (default: options)
  -f, --format <fmt>   Output format: json, human, csv, table

${colors.bold('EXAMPLES:')}
  productive custom-fields get 42236
  productive custom-fields get 42236 --format json
`);
  } else {
    console.log(`
${colors.bold('productive custom-fields')} - Manage custom field definitions

${colors.bold('USAGE:')}
  productive custom-fields <subcommand> [options]

${colors.bold('SUBCOMMANDS:')}
  list, ls            List custom field definitions
  get <id>            Get a custom field with its options

${colors.bold('COMMON OPTIONS:')}
  -f, --format <fmt>  Output format: json, human, csv, table
  -p, --page <num>    Page number for pagination
  -s, --size <num>    Page size (default: 25)
  -h, --help          Show help for a subcommand

${colors.bold('EXAMPLES:')}
  productive custom-fields list --type Task
  productive custom-fields get 42236
  productive custom-fields ls --format json

Run ${colors.cyan('productive custom-fields list --help')} for subcommand details.
`);
  }
}
