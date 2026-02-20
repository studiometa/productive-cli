/**
 * Schema handler - provides compact, machine-readable resource specifications
 *
 * More concise than action=help, optimized for LLM consumption when only
 * field metadata is needed (filters, create fields, includes).
 */

import type { ToolResult } from './types.js';

import { errorResult, jsonResult } from './utils.js';

/**
 * Field specification for create/update operations
 */
export interface ResourceFieldSpec {
  required: boolean;
  type: string;
}

/**
 * Compact schema data for a resource
 */
export interface ResourceSchemaData {
  actions: string[];
  filters: Record<string, string>;
  create?: Record<string, ResourceFieldSpec>;
  update?: string[];
  includes?: string[];
}

/**
 * Schema definitions for all resources.
 *
 * This provides a compact, machine-readable specification of each resource's
 * capabilities. For detailed documentation with examples, use action=help.
 */
const RESOURCE_SCHEMAS: Record<string, ResourceSchemaData> = {
  projects: {
    actions: ['list', 'get', 'resolve'],
    filters: {
      query: 'string — text search on project name',
      project_type: '1=internal|2=client',
      company_id: 'string',
      responsible_id: 'string',
      person_id: 'string',
      status: '1=active|2=archived',
    },
  },

  time: {
    actions: ['list', 'get', 'create', 'update', 'delete'],
    filters: {
      person_id: "string — use 'me' for current user",
      after: 'date YYYY-MM-DD',
      before: 'date YYYY-MM-DD',
      project_id: 'string',
      service_id: 'string',
      task_id: 'string',
      status: '1=approved|2=unapproved|3=rejected',
    },
    create: {
      person_id: { required: true, type: 'string' },
      service_id: { required: true, type: 'string' },
      date: { required: true, type: 'date YYYY-MM-DD' },
      time: { required: true, type: 'minutes integer' },
      note: { required: false, type: 'string' },
      task_id: { required: false, type: 'string' },
    },
    includes: ['person', 'service', 'task'],
  },

  tasks: {
    actions: ['list', 'get', 'create', 'update', 'resolve'],
    filters: {
      query: 'string — text search on task title',
      project_id: 'string',
      assignee_id: 'string',
      status: '1=open|2=closed (or "open", "closed", "all")',
      task_list_id: 'string',
      workflow_status_id: 'string — kanban column',
    },
    create: {
      title: { required: true, type: 'string' },
      project_id: { required: true, type: 'string' },
      task_list_id: { required: true, type: 'string' },
      description: { required: false, type: 'string' },
      assignee_id: { required: false, type: 'string' },
    },
    includes: ['project', 'assignee', 'comments', 'subtasks', 'workflow_status'],
  },

  services: {
    actions: ['list', 'get'],
    filters: {
      project_id: 'string',
      deal_id: 'string',
      task_id: 'string',
      budget_status: '1=open|2=delivered',
    },
  },

  people: {
    actions: ['list', 'get', 'me', 'resolve'],
    filters: {
      query: 'string — text search on name or email',
      status: '1=active|2=deactivated',
      company_id: 'string',
    },
  },

  companies: {
    actions: ['list', 'get', 'create', 'update', 'resolve'],
    filters: {
      query: 'string — text search on company name',
      archived: 'boolean',
    },
    create: {
      name: { required: true, type: 'string' },
    },
  },

  comments: {
    actions: ['list', 'get', 'create', 'update'],
    filters: {
      task_id: 'string',
      deal_id: 'string',
      page_id: 'string',
      discussion_id: 'string',
    },
    create: {
      body: { required: true, type: 'string' },
      task_id: { required: false, type: 'string — one of task_id, deal_id required' },
      deal_id: { required: false, type: 'string — one of task_id, deal_id required' },
    },
    includes: ['creator'],
  },

  attachments: {
    actions: ['list', 'get', 'delete'],
    filters: {
      task_id: 'string',
      comment_id: 'string',
      deal_id: 'string',
      page_id: 'string',
    },
  },

  timers: {
    actions: ['list', 'get', 'start', 'stop'],
    filters: {
      person_id: 'string',
      time_entry_id: 'string',
    },
  },

  deals: {
    actions: ['list', 'get', 'create', 'update', 'resolve'],
    filters: {
      query: 'string — text search on deal name',
      company_id: 'string',
      type: '1=deal|2=budget',
      stage_status_id: '1=open|2=won|3=lost',
    },
    create: {
      name: { required: true, type: 'string' },
      company_id: { required: true, type: 'string' },
    },
    includes: ['company', 'deal_status'],
  },

  bookings: {
    actions: ['list', 'get', 'create', 'update'],
    filters: {
      person_id: 'string',
      after: 'date YYYY-MM-DD',
      before: 'date YYYY-MM-DD',
      service_id: 'string',
    },
    create: {
      person_id: { required: true, type: 'string' },
      started_on: { required: true, type: 'date YYYY-MM-DD' },
      ended_on: { required: true, type: 'date YYYY-MM-DD' },
      service_id: { required: false, type: 'string — one of service_id, event_id required' },
      event_id: { required: false, type: 'string — one of service_id, event_id required' },
    },
  },

  pages: {
    actions: ['list', 'get', 'create', 'update', 'delete'],
    filters: {
      project_id: 'string',
    },
    create: {
      title: { required: true, type: 'string' },
      project_id: { required: true, type: 'string' },
      body: { required: false, type: 'string' },
      parent_page_id: { required: false, type: 'string' },
    },
  },

  discussions: {
    actions: ['list', 'get', 'create', 'update', 'delete', 'resolve', 'reopen'],
    filters: {
      page_id: 'string',
      status: '1=active|2=resolved',
    },
    create: {
      body: { required: true, type: 'string' },
      page_id: { required: true, type: 'string' },
    },
  },

  reports: {
    actions: ['get'],
    filters: {
      person_id: 'string',
      project_id: 'string',
      company_id: 'string',
      after: 'date YYYY-MM-DD',
      before: 'date YYYY-MM-DD',
    },
    create: {
      report_type: { required: true, type: 'time_reports|project_reports|budget_reports|...' },
      from: { required: false, type: 'date YYYY-MM-DD' },
      to: { required: false, type: 'date YYYY-MM-DD' },
      group: { required: false, type: 'string — grouping dimension' },
    },
  },
};

/**
 * Handle schema action - returns compact specification for a specific resource
 */
export function handleSchema(resource: string): ToolResult {
  const schema = RESOURCE_SCHEMAS[resource];

  if (!schema) {
    return errorResult(
      `Unknown resource: ${resource}. Valid resources: ${Object.keys(RESOURCE_SCHEMAS).join(', ')}`,
    );
  }

  return jsonResult({
    resource,
    ...schema,
  });
}

/**
 * Get schema overview for all resources
 */
export function handleSchemaOverview(): ToolResult {
  const overview = Object.entries(RESOURCE_SCHEMAS).map(([resource, schema]) => ({
    resource,
    actions: schema.actions,
  }));

  return jsonResult({
    _tip: 'Use action="schema" with a specific resource for full filter/create/includes spec',
    resources: overview,
  });
}
