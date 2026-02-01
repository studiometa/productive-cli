import { OutputFormatter } from '../output.js';
import { colors } from '../utils/colors.js';
import type { OutputFormat } from '../types.js';
import { runCommand } from '../error-handler.js';
import { createContext, type CommandContext, type CommandOptions } from '../context.js';
import { formatBudget, formatListResponse } from '../formatters/index.js';
import { render, createRenderContext } from '../renderers/index.js';

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

export function showBudgetsHelp(subcommand?: string): void {
  if (subcommand === 'list' || subcommand === 'ls') {
    console.log(`
${colors.bold('productive budgets list')} - List budgets

${colors.bold('USAGE:')}
  productive budgets list [options]

${colors.bold('OPTIONS:')}
  --project <id>      Filter by project ID
  --company <id>      Filter by company ID
  --filter <filters>  Generic filters (comma-separated key=value pairs)
  -p, --page <num>    Page number (default: 1)
  -s, --size <num>    Page size (default: 100)
  -f, --format <fmt>  Output format: json, human, csv, table

${colors.bold('EXAMPLES:')}
  productive budgets list
  productive budgets list --project 12345
  productive budgets list --company 67890
  productive budgets list --filter status=1
`);
  } else {
    console.log(`
${colors.bold('productive budgets')} - Manage budgets

${colors.bold('USAGE:')}
  productive budgets <subcommand> [options]

${colors.bold('SUBCOMMANDS:')}
  list, ls            List budgets

${colors.bold('COMMON OPTIONS:')}
  -f, --format <fmt>  Output format: json, human, csv, table
  -p, --page <num>    Page number for pagination
  -s, --size <num>    Page size (default: 100)
  -h, --help          Show help for a subcommand

${colors.bold('EXAMPLES:')}
  productive budgets list
  productive budgets list --project 12345

Run ${colors.cyan('productive budgets list --help')} for subcommand details.
`);
  }
}

export async function handleBudgetsCommand(
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
      await budgetsListWithContext(ctx);
      break;
    default:
      formatter.error(`Unknown budgets subcommand: ${subcommand}`);
      process.exit(1);
  }
}

// ============================================================================
// Context-based command implementations (new pattern)
// ============================================================================

async function budgetsListWithContext(ctx: CommandContext): Promise<void> {
  const spinner = ctx.createSpinner('Fetching budgets...');
  spinner.start();

  await runCommand(async () => {
    const filter: Record<string, string> = {};

    if (ctx.options.filter) {
      Object.assign(filter, parseFilters(String(ctx.options.filter)));
    }

    if (ctx.options.project) {
      filter.project_id = String(ctx.options.project);
    }
    if (ctx.options.company) {
      filter.company_id = String(ctx.options.company);
    }

    const { page, perPage } = ctx.getPagination();
    const response = await ctx.api.getBudgets({
      page,
      perPage,
      filter,
    });

    spinner.succeed();

    const format = (ctx.options.format || ctx.options.f || 'human') as OutputFormat;
    const formattedData = formatListResponse(response.data, formatBudget, response.meta);

    if (format === 'csv' || format === 'table') {
      // For CSV/table, flatten the data for OutputFormatter
      const data = response.data.map((b) => ({
        id: b.id,
        time_total: b.attributes.total_time_budget || 0,
        time_remaining: b.attributes.remaining_time_budget || 0,
        money_total: b.attributes.total_monetary_budget || 0,
        money_remaining: b.attributes.remaining_monetary_budget || 0,
      }));
      ctx.formatter.output(data);
    } else {
      // Use renderer for json and human formats
      const renderCtx = createRenderContext({
        noColor: ctx.options['no-color'] === true,
      });
      render('budget', format, formattedData, renderCtx);
    }
  }, ctx.formatter);
}
