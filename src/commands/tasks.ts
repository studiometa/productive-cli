import { ProductiveApi, ProductiveApiError } from "../api.js";
import { OutputFormatter, createSpinner } from "../output.js";
import { getConfig } from "../config.js";
import { colors } from "../utils/colors.js";
import { stripHtml } from "../utils/html.js";
import { linkedId } from "../utils/productive-links.js";
import type { OutputFormat } from "../types.js";

function parseFilters(filterString: string): Record<string, string> {
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
  -f, --format <fmt>  Output format: json, human, csv, table

${colors.bold("EXAMPLES:")}
  productive tasks list
  productive tasks list --mine
  productive tasks list --mine --status completed
  productive tasks list --status all --project 12345
  productive tasks list --filter assignee_id=123
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

  switch (subcommand) {
    case "list":
    case "ls":
      await tasksList(options, formatter);
      break;
    case "get":
      await tasksGet(args, options, formatter);
      break;
    default:
      formatter.error(`Unknown tasks subcommand: ${subcommand}`);
      process.exit(1);
  }
}

// Helper to format time in minutes to human readable format
function formatTime(minutes: number | undefined): string {
  if (minutes === undefined || minutes === null) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}

// Helper to get included resource by type and id
function getIncludedResource(
  included:
    | Array<{ id: string; type: string; attributes: Record<string, unknown> }>
    | undefined,
  type: string,
  id: string | undefined,
): Record<string, unknown> | undefined {
  if (!included || !id) return undefined;
  return included.find((r) => r.type === type && r.id === id)?.attributes;
}

async function tasksList(
  options: Record<string, string | boolean>,
  formatter: OutputFormatter,
): Promise<void> {
  const spinner = createSpinner("Fetching tasks...", formatter["format"]);
  spinner.start();

  try {
    const config = getConfig();
    const api = new ProductiveApi(options);
    const filter: Record<string, string> = {};

    // Parse generic filters first
    if (options.filter) {
      Object.assign(filter, parseFilters(String(options.filter)));
    }

    // Specific filter options (override generic filters)
    if (options.mine && config.userId) {
      filter.assignee_id = config.userId;
    } else if (options.person) {
      filter.assignee_id = String(options.person);
    }
    if (options.project) {
      filter.project_id = String(options.project);
    }

    // Status filter: open (default), completed, or all
    const status = String(options.status || "open").toLowerCase();
    if (status === "open") {
      filter.status = "1"; // 1 = open/active
    } else if (status === "completed" || status === "done") {
      filter.status = "2"; // 2 = completed
    }
    // 'all' = no status filter

    const response = await api.getTasks({
      page: parseInt(String(options.page || options.p || "1")),
      perPage: parseInt(String(options.size || options.s || "100")),
      filter,
      sort: String(options.sort || ""),
      include: ["project", "assignee", "workflow_status"],
    });

    spinner.succeed();

    if (formatter["format"] === "json") {
      formatter.output({
        data: response.data.map((t) => {
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
            number: t.attributes.number,
            title: t.attributes.title,
            closed: t.attributes.closed,
            due_date: t.attributes.due_date,
            worked_time: t.attributes.worked_time,
            initial_estimate: t.attributes.initial_estimate,
            project_id: t.relationships?.project?.data?.id,
            project_name: projectData?.name,
            assignee_id: t.relationships?.assignee?.data?.id,
            assignee_name: assigneeData
              ? `${assigneeData.first_name} ${assigneeData.last_name}`
              : undefined,
            status_id: t.relationships?.workflow_status?.data?.id,
            status_name: statusData?.name,
            created_at: t.attributes.created_at,
            updated_at: t.attributes.updated_at,
          };
        }),
        meta: response.meta,
      });
    } else if (
      formatter["format"] === "csv" ||
      formatter["format"] === "table"
    ) {
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
      formatter.output(data);
    } else {
      response.data.forEach((task) => {
        const isClosed = task.attributes.closed;
        const statusIcon = isClosed ? colors.green("✓") : colors.yellow("○");
        const title = task.attributes.title || "Untitled";
        const taskNumber = task.attributes.number
          ? `#${task.attributes.number}`
          : "";

        // Get related data from included resources
        const projectData = getIncludedResource(
          response.included,
          "projects",
          task.relationships?.project?.data?.id,
        );
        const assigneeData = getIncludedResource(
          response.included,
          "people",
          task.relationships?.assignee?.data?.id,
        );
        const statusData = getIncludedResource(
          response.included,
          "workflow_statuses",
          task.relationships?.workflow_status?.data?.id,
        );

        // First line: status icon, task number, title, linked ID
        const numberPart = taskNumber ? colors.dim(taskNumber) + " " : "";
        console.log(
          `${statusIcon} ${numberPart}${colors.bold(title)} ${linkedId(task.id, "task")}`,
        );

        // Second line: project, assignee, workflow status
        const parts: string[] = [];
        if (projectData?.name) {
          parts.push(colors.cyan(String(projectData.name)));
        }
        if (assigneeData) {
          parts.push(
            `${colors.dim("→")} ${assigneeData.first_name} ${assigneeData.last_name}`,
          );
        }
        if (statusData?.name) {
          parts.push(colors.dim(`[${statusData.name}]`));
        }
        if (parts.length > 0) {
          console.log(`  ${parts.join(" ")}`);
        }

        // Third line: time tracking and due date
        const timeInfo: string[] = [];
        const worked = task.attributes.worked_time;
        const estimate = task.attributes.initial_estimate;
        if (worked !== undefined && worked > 0) {
          const workedStr = formatTime(worked);
          if (estimate !== undefined && estimate > 0) {
            const estimateStr = formatTime(estimate);
            const isOverBudget = worked > estimate;
            const ratio = `${workedStr}/${estimateStr}`;
            timeInfo.push(
              `${colors.dim("Time:")} ${isOverBudget ? colors.red(ratio) : ratio}`,
            );
          } else {
            timeInfo.push(`${colors.dim("Time:")} ${workedStr}`);
          }
        } else if (estimate !== undefined && estimate > 0) {
          timeInfo.push(`${colors.dim("Est:")} ${formatTime(estimate)}`);
        }

        if (task.attributes.due_date) {
          const dueDate = new Date(task.attributes.due_date);
          const now = new Date();
          const isOverdue = !isClosed && dueDate < now;
          const dueDateStr = task.attributes.due_date;
          timeInfo.push(
            `${colors.dim("Due:")} ${isOverdue ? colors.red(dueDateStr) : dueDateStr}`,
          );
        }

        if (timeInfo.length > 0) {
          console.log(`  ${timeInfo.join("  ")}`);
        }

        console.log();
      });

      if (response.meta?.total) {
        const currentPage = response.meta.page || 1;
        const perPage = response.meta.per_page || 100;
        const totalPages = Math.ceil(response.meta.total / perPage);
        console.log(
          colors.dim(
            `Page ${currentPage}/${totalPages} (Total: ${response.meta.total} tasks)`,
          ),
        );
      }
    }
  } catch (error) {
    spinner.fail();
    handleError(error, formatter);
  }
}

async function tasksGet(
  args: string[],
  options: Record<string, string | boolean>,
  formatter: OutputFormatter,
): Promise<void> {
  const [id] = args;

  if (!id) {
    formatter.error("Usage: productive tasks get <id>");
    process.exit(1);
  }

  const spinner = createSpinner("Fetching task...", formatter["format"]);
  spinner.start();

  try {
    const api = new ProductiveApi(options);
    const response = await api.getTask(id, {
      include: ["project", "assignee", "workflow_status"],
    });
    const task = response.data;

    // Get related data from included resources
    const projectData = getIncludedResource(
      response.included,
      "projects",
      task.relationships?.project?.data?.id,
    );
    const assigneeData = getIncludedResource(
      response.included,
      "people",
      task.relationships?.assignee?.data?.id,
    );
    const statusData = getIncludedResource(
      response.included,
      "workflow_statuses",
      task.relationships?.workflow_status?.data?.id,
    );

    spinner.succeed();

    if (formatter["format"] === "json") {
      formatter.output({
        id: task.id,
        number: task.attributes.number,
        title: task.attributes.title,
        description: task.attributes.description,
        closed: task.attributes.closed,
        due_date: task.attributes.due_date,
        worked_time: task.attributes.worked_time,
        initial_estimate: task.attributes.initial_estimate,
        project_id: task.relationships?.project?.data?.id,
        project_name: projectData?.name,
        assignee_id: task.relationships?.assignee?.data?.id,
        assignee_name: assigneeData
          ? `${assigneeData.first_name} ${assigneeData.last_name}`
          : undefined,
        status_id: task.relationships?.workflow_status?.data?.id,
        status_name: statusData?.name,
        created_at: task.attributes.created_at,
        updated_at: task.attributes.updated_at,
      });
    } else {
      const isClosed = task.attributes.closed;
      const statusIcon = isClosed
        ? colors.green("✓ Completed")
        : colors.yellow("○ Active");
      const taskNumber = task.attributes.number
        ? colors.dim(`#${task.attributes.number} `)
        : "";

      console.log(`${taskNumber}${colors.bold(task.attributes.title)}`);
      console.log(colors.dim("─".repeat(50)));
      console.log(`${colors.cyan("ID:")}       ${linkedId(task.id, "task")}`);
      console.log(`${colors.cyan("Status:")}   ${statusIcon}`);

      if (statusData?.name) {
        console.log(
          `${colors.cyan("Workflow:")} ${colors.dim(`[${statusData.name}]`)}`,
        );
      }

      if (projectData?.name) {
        console.log(`${colors.cyan("Project:")}  ${projectData.name}`);
      }

      if (assigneeData) {
        console.log(
          `${colors.cyan("Assignee:")} ${assigneeData.first_name} ${assigneeData.last_name}`,
        );
      }

      // Time tracking
      const worked = task.attributes.worked_time;
      const estimate = task.attributes.initial_estimate;
      if (worked !== undefined && worked > 0) {
        const workedStr = formatTime(worked);
        if (estimate !== undefined && estimate > 0) {
          const estimateStr = formatTime(estimate);
          const isOverBudget = worked > estimate;
          const ratio = `${workedStr} / ${estimateStr}`;
          console.log(
            `${colors.cyan("Time:")}     ${isOverBudget ? colors.red(ratio) : ratio}`,
          );
        } else {
          console.log(`${colors.cyan("Time:")}     ${workedStr}`);
        }
      } else if (estimate !== undefined && estimate > 0) {
        console.log(`${colors.cyan("Estimate:")} ${formatTime(estimate)}`);
      }

      if (task.attributes.due_date) {
        const dueDate = new Date(task.attributes.due_date);
        const now = new Date();
        const isOverdue = !isClosed && dueDate < now;
        const dueDateStr = task.attributes.due_date;
        console.log(
          `${colors.cyan("Due:")}      ${isOverdue ? colors.red(dueDateStr) : dueDateStr}`,
        );
      }

      if (task.attributes.description) {
        const description = stripHtml(task.attributes.description);
        if (description) {
          console.log();
          console.log(`${colors.cyan("Description:")}`);
          // Indent multiline descriptions
          const lines = description.split("\n").map((line) => `  ${line}`);
          console.log(lines.join("\n"));
        }
      }

      console.log();
      console.log(
        `${colors.dim("Created:")} ${new Date(task.attributes.created_at).toLocaleString()}`,
      );
      console.log(
        `${colors.dim("Updated:")} ${new Date(task.attributes.updated_at).toLocaleString()}`,
      );
    }
  } catch (error) {
    spinner.fail();
    handleError(error, formatter);
  }
}

function handleError(error: unknown, formatter: OutputFormatter): void {
  if (error instanceof ProductiveApiError) {
    if (formatter["format"] === "json") {
      formatter.output(error.toJSON());
    } else {
      formatter.error(error.message);
    }
  } else {
    formatter.error("An unexpected error occurred", error);
  }
  process.exit(1);
}
