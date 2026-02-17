/**
 * Shared constants for resources, actions, and report types.
 *
 * These arrays are the single source of truth, consumed by both:
 * - schema.ts (Zod validation schemas)
 * - tools.ts (MCP tool definition exposed to clients)
 *
 * Adding a value here automatically updates both the validation
 * and the MCP tool definition — no manual sync needed.
 */

/**
 * Resource types available in Productive.io
 */
export const RESOURCES = [
  'projects',
  'time',
  'tasks',
  'services',
  'people',
  'companies',
  'comments',
  'attachments',
  'timers',
  'deals',
  'bookings',
  'budgets',
  'pages',
  'discussions',
  'reports',
] as const;

export type Resource = (typeof RESOURCES)[number];

/**
 * Actions available for resources
 */
export const ACTIONS = [
  'list',
  'get',
  'create',
  'update',
  'delete',
  'resolve',
  'reopen',
  'me',
  'start',
  'stop',
  'help',
] as const;

export type Action = (typeof ACTIONS)[number];

/**
 * Report types available in Productive.io
 */
export const REPORT_TYPES = [
  'time_reports',
  'project_reports',
  'budget_reports',
  'person_reports',
  'invoice_reports',
  'payment_reports',
  'service_reports',
  'task_reports',
  'company_reports',
  'deal_reports',
  'timesheet_reports',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];
