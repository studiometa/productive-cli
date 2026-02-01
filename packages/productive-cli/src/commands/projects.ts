import { OutputFormatter } from '../output.js';
import { colors } from '../utils/colors.js';
import type { OutputFormat } from '../types.js';
import { exitWithValidationError, runCommand } from '../error-handler.js';
import { createContext, type CommandContext, type CommandOptions } from '../context.js';
import { formatProject, formatListResponse } from '../formatters/index.js';
import {
  render,
  createRenderContext,
  humanProjectDetailRenderer,
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

export function showProjectsHelp(subcommand?: string): void {
  if (subcommand === 'list' || subcommand === 'ls') {
    console.log(`
${colors.bold('productive projects list')} - List projects

${colors.bold('USAGE:')}
  productive projects list [options]

${colors.bold('OPTIONS:')}
  --company <id>      Filter by company ID
  --filter <filters>  Generic filters (comma-separated key=value pairs)
  -p, --page <num>    Page number (default: 1)
  -s, --size <num>    Page size (default: 100)
  --sort <field>      Sort by field (prefix with - for descending)
  -f, --format <fmt>  Output format: json, human, csv, table

${colors.bold('EXAMPLES:')}
  productive projects list
  productive projects list --company 12345
  productive projects list --filter archived=false
  productive projects list --format json
  productive projects list --sort -created_at
`);
  } else if (subcommand === 'get') {
    console.log(`
${colors.bold('productive projects get')} - Get project details

${colors.bold('USAGE:')}
  productive projects get <id>

${colors.bold('ARGUMENTS:')}
  <id>                Project ID (required)

${colors.bold('OPTIONS:')}
  -f, --format <fmt>  Output format: json, human

${colors.bold('EXAMPLES:')}
  productive projects get 12345
  productive projects get 12345 --format json
`);
  } else {
    console.log(`
${colors.bold('productive projects')} - Manage projects

${colors.bold('USAGE:')}
  productive projects <subcommand> [options]

${colors.bold('ALIASES:')}
  productive p

${colors.bold('SUBCOMMANDS:')}
  list, ls            List projects
  get <id>            Get project details

${colors.bold('COMMON OPTIONS:')}
  -f, --format <fmt>  Output format: json, human, csv, table
  -p, --page <num>    Page number for pagination
  -s, --size <num>    Page size (default: 100)
  -h, --help          Show help for a subcommand

${colors.bold('EXAMPLES:')}
  productive projects list
  productive projects get 12345

Run ${colors.cyan('productive projects <subcommand> --help')} for subcommand details.
`);
  }
}

export async function handleProjectsCommand(
  subcommand: string,
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const format = (options.format || options.f || 'human') as OutputFormat;
  const formatter = new OutputFormatter(format, options['no-color'] === true);

  // Create context for commands that support it
  const ctx = createContext(options as CommandOptions);

  switch (subcommand) {
    case 'list':
    case 'ls':
      await projectsListWithContext(ctx);
      break;
    case 'get':
      await projectsGetWithContext(args, ctx);
      break;
    default:
      formatter.error(`Unknown projects subcommand: ${subcommand}`);
      process.exit(1);
  }
}


/**
 * List projects using context-based dependency injection.
 */
async function projectsListWithContext(ctx: CommandContext): Promise<void> {
  const spinner = ctx.createSpinner('Fetching projects...');
  spinner.start();

  await runCommand(async () => {
    const filter: Record<string, string> = {};

    // Parse generic filters first
    if (ctx.options.filter) {
      Object.assign(filter, parseFilters(String(ctx.options.filter)));
    }

    // Specific filter options (override generic filters)
    if (ctx.options.company) {
      filter.company_id = String(ctx.options.company);
    }

    const { page, perPage } = ctx.getPagination();
    const response = await ctx.api.getProjects({
      page,
      perPage,
      filter,
      sort: ctx.getSort(),
    });

    spinner.succeed();

    const format = (ctx.options.format || ctx.options.f || 'human') as OutputFormat;
    const formattedData = formatListResponse(response.data, formatProject, response.meta);

    if (format === 'csv' || format === 'table') {
      // For CSV/table, flatten the data for OutputFormatter
      const data = response.data.map((p) => ({
        id: p.id,
        name: p.attributes.name,
        number: p.attributes.project_number || '',
        archived: p.attributes.archived ? 'yes' : 'no',
        budget: p.attributes.budget || '',
        created: p.attributes.created_at.split('T')[0],
      }));
      ctx.formatter.output(data);
    } else {
      // Use renderer for json and human formats
      const renderCtx = createRenderContext({
        noColor: ctx.options['no-color'] === true,
      });
      render('project', format, formattedData, renderCtx);
    }
  }, ctx.formatter);
}

/**
 * Get a single project using context-based dependency injection.
 */
async function projectsGetWithContext(args: string[], ctx: CommandContext): Promise<void> {
  const [id] = args;

  if (!id) {
    exitWithValidationError('id', 'productive projects get <id>', ctx.formatter);
  }

  const spinner = ctx.createSpinner('Fetching project...');
  spinner.start();

  await runCommand(async () => {
    const response = await ctx.api.getProject(id);
    const project = response.data;

    spinner.succeed();

    const format = (ctx.options.format || ctx.options.f || 'human') as OutputFormat;
    const formattedData = formatProject(project);

    if (format === 'json') {
      ctx.formatter.output(formattedData);
    } else {
      // Use detail renderer for human format
      const renderCtx = createRenderContext({
        noColor: ctx.options['no-color'] === true,
      });
      humanProjectDetailRenderer.render(formattedData, renderCtx);
    }
  }, ctx.formatter);
}

// ============================================================================
// Legacy implementations (kept for reference during migration)
// ============================================================================

// The old projectsList, projectsGet functions are kept above for
// backward compatibility but are no longer called
