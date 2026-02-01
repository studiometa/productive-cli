import { OutputFormatter } from '../output.js';
import { colors } from '../utils/colors.js';
import type { OutputFormat } from '../types.js';
import { exitWithValidationError, runCommand } from '../error-handler.js';
import { createContext, type CommandContext, type CommandOptions } from '../context.js';
import { formatPerson, formatListResponse } from '../formatters/index.js';
import {
  render,
  createRenderContext,
  humanPersonDetailRenderer,
} from '../renderers/index.js';

function parseFilters(filterString: string): Record<string, string> {
  const filters: Record<string, string> = {};
  if (!filterString) return filters;

  filterString.split(',').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) {
      filters[key.trim()] = value.trim();
    }
  });
  return filters;
}

export function showPeopleHelp(subcommand?: string): void {
  if (subcommand === 'list' || subcommand === 'ls') {
    console.log(`
${colors.bold('productive people list')} - List people

${colors.bold('USAGE:')}
  productive people list [options]

${colors.bold('OPTIONS:')}
  --company <id>      Filter by company ID
  --filter <filters>  Generic filters (comma-separated key=value pairs)
  -p, --page <num>    Page number (default: 1)
  -s, --size <num>    Page size (default: 100)
  --sort <field>      Sort by field (prefix with - for descending)
  -f, --format <fmt>  Output format: json, human, csv, table

${colors.bold('EXAMPLES:')}
  productive people list
  productive people list --company 12345
  productive people list --filter active=true
  productive people list --format json -p 2 -s 50
`);
  } else if (subcommand === 'get') {
    console.log(`
${colors.bold('productive people get')} - Get person details

${colors.bold('USAGE:')}
  productive people get <id>

${colors.bold('ARGUMENTS:')}
  <id>                Person ID (required)

${colors.bold('OPTIONS:')}
  -f, --format <fmt>  Output format: json, human

${colors.bold('EXAMPLES:')}
  productive people get 12345
  productive people get 12345 --format json
`);
  } else {
    console.log(`
${colors.bold('productive people')} - Manage people

${colors.bold('USAGE:')}
  productive people <subcommand> [options]

${colors.bold('SUBCOMMANDS:')}
  list, ls            List people
  get <id>            Get person details

${colors.bold('COMMON OPTIONS:')}
  -f, --format <fmt>  Output format: json, human, csv, table
  -p, --page <num>    Page number for pagination
  -s, --size <num>    Page size (default: 100)
  -h, --help          Show help for a subcommand

${colors.bold('EXAMPLES:')}
  productive people list
  productive people get 12345

Run ${colors.cyan('productive people <subcommand> --help')} for subcommand details.
`);
  }
}

export async function handlePeopleCommand(
  subcommand: string,
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const format = (options.format || options.f || 'human') as OutputFormat;
  const formatter = new OutputFormatter(format, options['no-color'] === true);

  const ctx = createContext(options as CommandOptions);

  switch (subcommand) {
    case 'list':
    case 'ls':
      await peopleListWithContext(ctx);
      break;
    case 'get':
      await peopleGetWithContext(args, ctx);
      break;
    default:
      formatter.error(`Unknown people subcommand: ${subcommand}`);
      process.exit(1);
  }
}

// ============================================================================
// Context-based command implementations (new pattern)
// ============================================================================

async function peopleListWithContext(ctx: CommandContext): Promise<void> {
  const spinner = ctx.createSpinner('Fetching people...');
  spinner.start();

  await runCommand(async () => {
    const filter: Record<string, string> = {};

    if (ctx.options.filter) {
      Object.assign(filter, parseFilters(String(ctx.options.filter)));
    }

    if (ctx.options.company) {
      filter.company_id = String(ctx.options.company);
    }

    const { page, perPage } = ctx.getPagination();
    const response = await ctx.api.getPeople({
      page,
      perPage,
      filter,
      sort: ctx.getSort(),
    });

    spinner.succeed();

    const format = (ctx.options.format || ctx.options.f || 'human') as OutputFormat;
    const formattedData = formatListResponse(response.data, formatPerson, response.meta);

    if (format === 'csv' || format === 'table') {
      // For CSV/table, flatten the data for OutputFormatter
      const data = response.data.map((p) => ({
        id: p.id,
        first_name: p.attributes.first_name,
        last_name: p.attributes.last_name,
        email: p.attributes.email,
        active: p.attributes.active ? 'yes' : 'no',
      }));
      ctx.formatter.output(data);
    } else {
      // Use renderer for json and human formats
      const renderCtx = createRenderContext({
        noColor: ctx.options['no-color'] === true,
      });
      render('person', format, formattedData, renderCtx);
    }
  }, ctx.formatter);
}

async function peopleGetWithContext(args: string[], ctx: CommandContext): Promise<void> {
  const [id] = args;

  if (!id) {
    exitWithValidationError('id', 'productive people get <id>', ctx.formatter);
  }

  const spinner = ctx.createSpinner('Fetching person...');
  spinner.start();

  await runCommand(async () => {
    const response = await ctx.api.getPerson(id);
    const person = response.data;

    spinner.succeed();

    const format = (ctx.options.format || ctx.options.f || 'human') as OutputFormat;
    const formattedData = formatPerson(person);

    if (format === 'json') {
      ctx.formatter.output(formattedData);
    } else {
      // Use detail renderer for human format
      const renderCtx = createRenderContext({
        noColor: ctx.options['no-color'] === true,
      });
      humanPersonDetailRenderer.render(formattedData, renderCtx);
    }
  }, ctx.formatter);
}
