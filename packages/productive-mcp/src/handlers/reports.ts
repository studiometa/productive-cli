/**
 * Reports resource handler
 */

import type { CommonArgs, HandlerContext, ToolResult } from './types.js';

import { ErrorMessages } from '../errors.js';
import { inputErrorResult, jsonResult } from './utils.js';

/**
 * Report-specific args
 */
interface ReportArgs extends CommonArgs {
  report_type?: string;
  group?: string;
  from?: string;
  to?: string;
  person_id?: string;
  project_id?: string;
  company_id?: string;
  deal_id?: string;
  status?: string;
}

/**
 * Format report data for agent consumption
 * Flattens attributes for easier reading
 */
function formatReportData(data: unknown[]): unknown[] {
  return data.map((item: unknown) => {
    const record = item as { id: string; type: string; attributes: Record<string, unknown> };
    return {
      id: record.id,
      type: record.type,
      ...record.attributes,
    };
  });
}

/**
 * Valid report types
 */
const VALID_REPORT_TYPES = [
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
];

const VALID_ACTIONS = ['get'];

export async function handleReports(
  action: string,
  args: ReportArgs,
  ctx: HandlerContext,
): Promise<ToolResult> {
  const { api, filter, page, perPage } = ctx;
  const { report_type, group, from, to, person_id, project_id, company_id, deal_id, status } = args;

  if (action !== 'get') {
    return inputErrorResult(ErrorMessages.invalidAction(action, 'reports', VALID_ACTIONS));
  }

  if (!report_type) {
    return inputErrorResult(ErrorMessages.missingReportType());
  }

  if (!VALID_REPORT_TYPES.includes(report_type)) {
    return inputErrorResult(ErrorMessages.invalidReportType(report_type, VALID_REPORT_TYPES));
  }

  // Build filters based on report type
  const reportFilter: Record<string, string> = { ...filter };

  // Date filters (different APIs use different param names)
  if (from) {
    if (report_type === 'invoice_reports') {
      reportFilter.invoice_date_after = from;
    } else if (report_type === 'payment_reports' || report_type === 'deal_reports') {
      reportFilter.date_after = from;
    } else {
      reportFilter.after = from;
    }
  }

  if (to) {
    if (report_type === 'invoice_reports') {
      reportFilter.invoice_date_before = to;
    } else if (report_type === 'payment_reports' || report_type === 'deal_reports') {
      reportFilter.date_before = to;
    } else {
      reportFilter.before = to;
    }
  }

  // Entity filters
  if (person_id) {
    if (report_type === 'task_reports') {
      reportFilter.assignee_id = person_id;
    } else {
      reportFilter.person_id = person_id;
    }
  }

  if (project_id) reportFilter.project_id = project_id;
  if (company_id) reportFilter.company_id = company_id;
  if (deal_id) {
    if (report_type === 'deal_reports') {
      reportFilter.deal_status_id = deal_id;
    } else {
      reportFilter.deal_id = deal_id;
    }
  }
  if (status) {
    if (report_type === 'deal_reports') {
      reportFilter.deal_status_id = status;
    } else {
      reportFilter.status = status;
    }
  }

  // Determine default grouping based on report type
  let effectiveGroup = group;
  if (!effectiveGroup) {
    const defaultGroups: Record<string, string> = {
      time_reports: 'person',
      project_reports: 'project',
      budget_reports: 'deal',
      person_reports: 'person',
      invoice_reports: 'invoice',
      payment_reports: 'payment',
      service_reports: 'service',
      task_reports: 'task',
      company_reports: 'company',
      deal_reports: 'deal',
    };
    effectiveGroup = defaultGroups[report_type];
  }

  // Determine include based on report type
  const includeMap: Record<string, string[]> = {
    project_reports: ['project'],
    budget_reports: ['deal'],
    person_reports: ['person'],
    invoice_reports: ['invoice'],
    payment_reports: ['payment'],
    service_reports: ['service'],
    task_reports: ['task'],
    company_reports: ['company'],
    deal_reports: ['deal'],
    timesheet_reports: ['person'],
  };
  const include = includeMap[report_type];

  const result = await api.getReports(report_type, {
    page,
    perPage,
    filter: reportFilter,
    group: effectiveGroup,
    include,
  });

  const formattedData = formatReportData(result.data);

  return jsonResult({
    data: formattedData,
    meta: result.meta,
  });
}
