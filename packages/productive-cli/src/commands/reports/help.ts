/**
 * Help text for reports command
 */

import { colors } from '../../utils/colors.js';

interface ReportHelpConfig {
  name: string;
  description: string;
  options: string[];
  examples: string[];
}

const commonOptions = [
  '--filter <filters>  Generic filters (comma-separated key=value pairs)',
  '-p, --page <num>    Page number (default: 1)',
  '-s, --size <num>    Page size (default: 100)',
  '-f, --format <fmt>  Output format: json, human (default: json)',
];

const reportConfigs: Record<string, ReportHelpConfig> = {
  time: {
    name: 'time',
    description: 'Time reports',
    options: [
      '--from <date>       Filter by start date (YYYY-MM-DD)',
      '--to <date>         Filter by end date (YYYY-MM-DD)',
      '--person <id>       Filter by person ID',
      '--project <id>      Filter by project ID',
      '--group <field>     Group by: person, project, service, deal (default: person)',
    ],
    examples: [
      'productive reports time --from 2024-01-01 --to 2024-01-31',
      'productive reports time --group project --format json',
      'productive reports time --person 12345 --from 2024-01-01',
    ],
  },
  project: {
    name: 'project',
    description: 'Project reports',
    options: [
      '--company <id>      Filter by company ID',
      '--group <field>     Group by: project, company (default: project)',
    ],
    examples: [
      'productive reports project --format json',
      'productive reports project --company 12345',
    ],
  },
  budget: {
    name: 'budget',
    description: 'Budget reports',
    options: [
      '--company <id>      Filter by company ID',
      '--group <field>     Group by: deal, company (default: deal)',
    ],
    examples: [
      'productive reports budget --format json',
      'productive reports budget --company 12345',
    ],
  },
  person: {
    name: 'person',
    description: 'Person reports',
    options: [
      '--from <date>       Filter by start date (YYYY-MM-DD)',
      '--to <date>         Filter by end date (YYYY-MM-DD)',
      '--group <field>     Group by: person, team (default: person)',
    ],
    examples: [
      'productive reports person --format json',
      'productive reports person --from 2024-01-01 --to 2024-01-31',
    ],
  },
  invoice: {
    name: 'invoice',
    description: 'Invoice reports',
    options: [
      '--company <id>      Filter by company ID',
      '--status <status>   Filter by invoice status (draft, sent, paid, overdue)',
      '--from <date>       Filter by invoice date start (YYYY-MM-DD)',
      '--to <date>         Filter by invoice date end (YYYY-MM-DD)',
      '--group <field>     Group by: invoice, company, project (default: invoice)',
    ],
    examples: [
      'productive reports invoice --format json',
      'productive reports invoice --company 12345 --status overdue',
      'productive reports invoice --from 2024-01-01 --to 2024-01-31',
    ],
  },
  payment: {
    name: 'payment',
    description: 'Payment reports',
    options: [
      '--company <id>      Filter by company ID',
      '--from <date>       Filter by payment date start (YYYY-MM-DD)',
      '--to <date>         Filter by payment date end (YYYY-MM-DD)',
      '--group <field>     Group by: payment, company, invoice (default: payment)',
    ],
    examples: [
      'productive reports payment --format json',
      'productive reports payment --from 2024-01-01 --to 2024-01-31',
      'productive reports payment --company 12345',
    ],
  },
  service: {
    name: 'service',
    description: 'Service reports',
    options: [
      '--project <id>      Filter by project ID',
      '--deal <id>         Filter by deal ID',
      '--group <field>     Group by: service, project, deal (default: service)',
    ],
    examples: [
      'productive reports service --format json',
      'productive reports service --project 12345',
      'productive reports service --deal 67890',
    ],
  },
  task: {
    name: 'task',
    description: 'Task reports',
    options: [
      '--project <id>      Filter by project ID',
      '--person <id>       Filter by assignee ID',
      '--status <status>   Filter by task status',
      '--group <field>     Group by: task, project, assignee, status (default: task)',
    ],
    examples: [
      'productive reports task --format json',
      'productive reports task --project 12345',
      'productive reports task --person 67890 --group project',
    ],
  },
  company: {
    name: 'company',
    description: 'Company reports',
    options: [
      '--from <date>       Filter by date start (YYYY-MM-DD)',
      '--to <date>         Filter by date end (YYYY-MM-DD)',
      '--group <field>     Group by: company (default: company)',
    ],
    examples: [
      'productive reports company --format json',
      'productive reports company --from 2024-01-01 --to 2024-12-31',
    ],
  },
  deal: {
    name: 'deal',
    description: 'Deal reports',
    options: [
      '--company <id>      Filter by company ID',
      '--status <id>       Filter by deal status ID',
      '--from <date>       Filter by deal date start (YYYY-MM-DD)',
      '--to <date>         Filter by deal date end (YYYY-MM-DD)',
      '--group <field>     Group by: deal, company, status (default: deal)',
    ],
    examples: [
      'productive reports deal --format json',
      'productive reports deal --company 12345',
      'productive reports deal --from 2024-01-01 --status 789',
    ],
  },
  timesheet: {
    name: 'timesheet',
    description: 'Timesheet reports',
    options: [
      '--person <id>       Filter by person ID',
      '--status <status>   Filter by timesheet status (pending, approved, rejected)',
      '--from <date>       Filter by date start (YYYY-MM-DD)',
      '--to <date>         Filter by date end (YYYY-MM-DD)',
    ],
    examples: [
      'productive reports timesheet --format json',
      'productive reports timesheet --person 12345',
      'productive reports timesheet --status pending --from 2024-01-01',
    ],
  },
};

// Map aliases to canonical names
const aliasMap: Record<string, string> = {
  projects: 'project',
  budgets: 'budget',
  people: 'person',
  invoices: 'invoice',
  payments: 'payment',
  services: 'service',
  tasks: 'task',
  companies: 'company',
  deals: 'deal',
  timesheets: 'timesheet',
};

function showReportTypeHelp(config: ReportHelpConfig): void {
  const allOptions = [...config.options, ...commonOptions];

  console.log(`
${colors.bold(`productive reports ${config.name}`)} - ${config.description}

${colors.bold('USAGE:')}
  productive reports ${config.name} [options]

${colors.bold('OPTIONS:')}
  ${allOptions.join('\n  ')}

${colors.bold('EXAMPLES:')}
  ${config.examples.join('\n  ')}
`);
}

function showMainHelp(): void {
  console.log(`
${colors.bold('productive reports')} - Generate reports

${colors.bold('USAGE:')}
  productive reports <type> [options]

${colors.bold('REPORT TYPES:')}
  time                Time tracking reports
  project             Project reports (revenue, cost, profit)
  budget              Budget reports (time budgets)
  person              Person/team reports
  invoice             Invoice reports (amounts, status, outstanding)
  payment             Payment reports (cash flow)
  service             Service reports (budget vs worked time)
  task                Task reports (completion, workload)
  company             Company reports (client profitability)
  deal                Deal reports (pipeline, won/lost)
  timesheet           Timesheet reports (approval status)

${colors.bold('COMMON OPTIONS:')}
  --from <date>       Filter by start date (YYYY-MM-DD)
  --to <date>         Filter by end date (YYYY-MM-DD)
  --group <field>     Group results by field
  --filter <filters>  Generic filters (comma-separated key=value pairs)
  -f, --format <fmt>  Output format: json, human (default: json)
  -p, --page <num>    Page number for pagination
  -s, --size <num>    Page size (default: 100)
  -h, --help          Show help for a report type

${colors.bold('EXAMPLES:')}
  productive reports time --from 2024-01-01 --to 2024-01-31
  productive reports project --company 12345 --format json
  productive reports invoice --status overdue
  productive reports deal --group company
  productive reports timesheet --person 12345 --status pending

Run ${colors.cyan('productive reports <type> --help')} for report-specific options.
`);
}

export function showReportsHelp(subcommand?: string): void {
  if (!subcommand) {
    showMainHelp();
    return;
  }

  // Resolve alias to canonical name
  const canonicalName = aliasMap[subcommand] || subcommand;
  const config = reportConfigs[canonicalName];

  if (config) {
    showReportTypeHelp(config);
  } else {
    showMainHelp();
  }
}
