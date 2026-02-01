import { OutputFormatter } from "../output.js";
import { colors } from "../utils/colors.js";
import type { OutputFormat } from "../types.js";
import { exitWithValidationError, runCommand } from "../error-handler.js";
import { createContext, type CommandContext, type CommandOptions } from "../context.js";
import { formatTask, formatListResponse } from "../formatters/index.js";
import {
  render,
  createRenderContext,
  humanTaskDetailRenderer,
  // Re-export helpers for backward compatibility with tests
  formatTime as _formatTime,
  stripAnsi as _stripAnsi,
  truncateText as _truncateText,
  padText as _padText,
} from "../renderers/index.js";

// Re-export helpers for backward compatibility
export const formatTime = _formatTime;
export const stripAnsi = _stripAnsi;
export const truncateText = _truncateText;
export const padText = _padText;

/**
 * Parse filter string into key-value pairs
 * @example parseFilters("assignee_id=123,status=open") => { assignee_id: "123", status: "open" }
 */
export function parseFilters(filterString: string): Record<string, string> {
  const filters: Record<string, string> = {};
  if (!filterString) return filters;

  filterString.split(",").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key && value) {
      filters[key.trim()] = value.trim();
    }
  });
  return filters;
}

export function showTasksHelp(subcommand?: string): void {
  if (subcommand === "list" || subcommand === "ls") {
    console.log(`
${colors.bold("productive tasks list")} - List tasks

${colors.bold("USAGE:")}
  productive tasks list [options]

${colors.bold("OPTIONS:")}
  --mine              Filter by configured user ID (assignee)
  --status <status>   Filter by status: open, completed, all (default: open)
  --person <id>       Filter by assignee person ID
  --project <id>      Filter by project ID
  --filter <filters>  Generic filters (comma-separated key=value pairs)
  -p, --page <num>    Page number (default: 1)
  -s, --size <num>    Page size (default: 100)
  --sort <field>      Sort by field (prefix with - for descending)
  -f, --format <fmt>  Output format: json, human, csv, table, kanban

${colors.bold("EXAMPLES:")}
  productive tasks list
  productive tasks list --mine
  productive tasks list --mine --status completed
  productive tasks list --status all --project 12345
  productive tasks list --filter assignee_id=123
  productive tasks list --format kanban --project 12345
`);
  } else if (subcommand === "get") {
    console.log(`
${colors.bold("productive tasks get")} - Get task details

${colors.bold("USAGE:")}
  productive tasks get <id>

${colors.bold("ARGUMENTS:")}
  <id>                Task ID (required)

${colors.bold("OPTIONS:")}
  -f, --format <fmt>  Output format: json, human

${colors.bold("EXAMPLES:")}
  productive tasks get 12345
  productive tasks get 12345 --format json
`);
  } else {
    console.log(`
${colors.bold("productive tasks")} - Manage tasks

${colors.bold("USAGE:")}
  productive tasks <subcommand> [options]

${colors.bold("SUBCOMMANDS:")}
  list, ls            List tasks
  get <id>            Get task details

${colors.bold("COMMON OPTIONS:")}
  -f, --format <fmt>  Output format: json, human, csv, table
  -p, --page <num>    Page number for pagination
  -s, --size <num>    Page size (default: 100)
  -h, --help          Show help for a subcommand

${colors.bold("EXAMPLES:")}
  productive tasks list
  productive tasks list --project 12345
  productive tasks get 67890

Run ${colors.cyan("productive tasks <subcommand> --help")} for subcommand details.
`);
  }
}

export async function handleTasksCommand(
  subcommand: string,
  args: string[],
  options: Record<string, string | boolean>,
): Promise<void> {
  const format = (options.format || options.f || "human") as OutputFormat;
  const formatter = new OutputFormatter(format, options["no-color"] === true);

  const ctx = createContext(options as CommandOptions);

  switch (subcommand) {
    case "list":
    case "ls":
      await tasksListWithContext(ctx);
      break;
    case "get":
      await tasksGetWithContext(args, ctx);
      break;
    default:
      formatter.error(`Unknown tasks subcommand: ${subcommand}`);
      process.exit(1);
  }
}

/**
 * Get included resource by type and id from JSON:API includes
 */
export function getIncludedResource(
  included:
    | Array<{ id: string; type: string; attributes: Record<string, unknown> }>
    | undefined,
  type: string,
  id: string | undefined,
): Record<string, unknown> | undefined {
  if (!included || !id) return undefined;
  return included.find((r) => r.type === type && r.id === id)?.attributes;
}
// ============================================================================
// Context-based command implementations (new pattern)
// ============================================================================

async function tasksListWithContext(ctx: CommandContext): Promise<void> {
  const spinner = ctx.createSpinner("Fetching tasks...");
  spinner.start();

  await runCommand(async () => {
    const filter: Record<string, string> = {};

    if (ctx.options.filter) {
      Object.assign(filter, parseFilters(String(ctx.options.filter)));
    }

    if (ctx.options.mine && ctx.config.userId) {
      filter.assignee_id = ctx.config.userId;
    } else if (ctx.options.person) {
      filter.assignee_id = String(ctx.options.person);
    }
    if (ctx.options.project) {
      filter.project_id = String(ctx.options.project);
    }

    const status = String(ctx.options.status || "open").toLowerCase();
    if (status === "open") {
      filter.status = "1";
    } else if (status === "completed" || status === "done") {
      filter.status = "2";
    }

    const { page, perPage } = ctx.getPagination();
    const response = await ctx.api.getTasks({
      page,
      perPage,
      filter,
      sort: ctx.getSort(),
      include: ["project", "assignee", "workflow_status"],
    });

    spinner.succeed();

    const format = (ctx.options.format || ctx.options.f || "human") as OutputFormat;
    const formattedData = formatListResponse(response.data, formatTask, response.meta, {
      included: response.included,
    });

    if (format === "csv" || format === "table") {
      // For CSV/table, flatten the data for OutputFormatter
      const data = response.data.map((t) => {
        const projectData = getIncludedResource(
          response.included,
          "projects",
          t.relationships?.project?.data?.id,
        );
        const assigneeData = getIncludedResource(
          response.included,
          "people",
          t.relationships?.assignee?.data?.id,
        );
        const statusData = getIncludedResource(
          response.included,
          "workflow_statuses",
          t.relationships?.workflow_status?.data?.id,
        );
        return {
          id: t.id,
          number: t.attributes.number || "",
          title: t.attributes.title,
          project: projectData?.name || "",
          assignee: assigneeData
            ? `${assigneeData.first_name} ${assigneeData.last_name}`
            : "",
          status: statusData?.name || "",
          worked: formatTime(t.attributes.worked_time),
          estimate: formatTime(t.attributes.initial_estimate),
          due_date: t.attributes.due_date || "",
        };
      });
      ctx.formatter.output(data);
    } else {
      // Use renderer for json, human, and kanban formats
      const renderCtx = createRenderContext({
        noColor: ctx.options["no-color"] === true,
      });
      render("task", format, formattedData, renderCtx);
    }
  }, ctx.formatter);
}

async function tasksGetWithContext(args: string[], ctx: CommandContext): Promise<void> {
  const [id] = args;

  if (!id) {
    exitWithValidationError("id", "productive tasks get <id>", ctx.formatter);
  }

  const spinner = ctx.createSpinner("Fetching task...");
  spinner.start();

  await runCommand(async () => {
    const response = await ctx.api.getTask(id, {
      include: ["project", "assignee", "workflow_status"],
    });
    const task = response.data;

    spinner.succeed();

    const format = (ctx.options.format || ctx.options.f || "human") as OutputFormat;
    const formattedData = formatTask(task, { included: response.included });

    if (format === "json") {
      ctx.formatter.output(formattedData);
    } else {
      // Use detail renderer for human format
      const renderCtx = createRenderContext({
        noColor: ctx.options["no-color"] === true,
      });
      humanTaskDetailRenderer.render(formattedData, renderCtx);
    }
  }, ctx.formatter);
}
