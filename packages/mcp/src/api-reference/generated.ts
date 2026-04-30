import type { ApiReference } from './types.js';

export const PRODUCTIVE_API_REFERENCE: ApiReference = {
  '/companies': {
    path: '/companies',
    methods: {
      GET: {
        summary: 'List companies',
        query: {
          include: { type: 'string', description: 'Comma-separated relationships to include.' },
          sort: { type: 'string', description: 'Sort fields.' },
          'page[number]': { type: 'number' },
          'page[size]': { type: 'number' },
        },
        filters: {
          name: {
            type: 'string',
            description: 'Company name.',
            operators: { eq: {}, contains: {}, not_contain: {} },
          },
        },
        sort: ['name', '-name'],
      },
    },
  },
  '/custom_fields': {
    path: '/custom_fields',
    methods: {
      GET: {
        summary: 'List custom fields',
        query: { 'page[number]': { type: 'number' }, 'page[size]': { type: 'number' } },
        filters: {
          customizable_type: { type: 'string', operators: { eq: {}, contains: {} } },
          name: { type: 'string', operators: { eq: {}, contains: {} } },
        },
      },
    },
  },
  '/custom_field_options': {
    path: '/custom_field_options',
    methods: {
      GET: {
        summary: 'List custom field options',
        filters: {
          custom_field_id: { type: 'string', operators: { eq: {} } },
        },
      },
    },
  },
  '/invoices': {
    path: '/invoices',
    methods: {
      GET: {
        summary: 'List invoices',
        query: {
          include: { type: 'string', description: 'Comma-separated relationships to include.' },
          sort: { type: 'string', description: 'Sort fields.' },
          'page[number]': { type: 'number' },
          'page[size]': { type: 'number' },
        },
        filters: {
          sent_status: {
            type: 'integer',
            enum: [1, 2],
            operators: { eq: {}, not_eq: {} },
          },
          sent_on: {
            type: 'string',
            format: 'date',
            operators: { eq: {}, contains: {}, not_contain: {} },
          },
          amount_unpaid: {
            type: 'number',
            operators: { eq: {}, not_eq: {} },
          },
          company_id: {
            type: 'string',
            operators: { eq: {} },
          },
        },
        sort: ['sent_on', '-sent_on', 'amount', '-amount'],
      },
    },
  },
  '/reports/invoice_reports': {
    path: '/reports/invoice_reports',
    methods: {
      GET: {
        summary: 'Get invoice report rows',
        query: {
          include: { type: 'string' },
          sort: { type: 'string' },
          'page[number]': { type: 'number' },
          'page[size]': { type: 'number' },
        },
        filters: {
          invoice_date_after: {
            type: 'string',
            format: 'date',
            operators: { eq: {}, contains: {} },
          },
          invoice_date_before: {
            type: 'string',
            format: 'date',
            operators: { eq: {}, contains: {} },
          },
          company_id: { type: 'string', operators: { eq: {} } },
        },
      },
    },
  },
  '/tasks/{id}': {
    path: '/tasks/{id}',
    methods: {
      GET: {
        summary: 'Get a task',
        query: {
          include: { type: 'string', description: 'Comma-separated relationships to include.' },
        },
      },
      PATCH: {
        summary: 'Update a task',
        supportsBody: true,
      },
    },
  },
} as const;
