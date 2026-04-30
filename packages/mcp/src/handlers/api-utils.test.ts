import { describe, expect, it } from 'vitest';

import {
  buildApiReadQuery,
  describeApiEndpoint,
  normalizeApiPath,
  resolveApiEndpoint,
  serializeFilter,
  validateFilterSpec,
  validateSort,
} from './api-utils.js';

describe('api-utils', () => {
  it('normalizes /api/v2 paths', () => {
    expect(normalizeApiPath('/api/v2/invoices')).toBe('/invoices');
  });

  it('rejects absolute urls', () => {
    expect(() => normalizeApiPath('https://example.com')).toThrow('must start with');
    expect(() => normalizeApiPath('//example.com')).toThrow('Absolute URLs');
  });

  it('rejects traversal paths', () => {
    expect(() => normalizeApiPath('/../invoices')).toThrow('traversal');
    expect(() => normalizeApiPath('/%2e%2e/invoices')).toThrow('traversal');
  });

  it('resolves templated endpoints', () => {
    const resolved = resolveApiEndpoint('/tasks/123', 'PATCH');
    expect(resolved.spec.path).toBe('/tasks/{id}');
    expect(resolved.normalizedPath).toBe('/tasks/123');
  });

  it('serializes nested filters', () => {
    expect(
      serializeFilter({
        sent_status: { eq: 2 },
        $op: 'and',
        0: { amount_unpaid: { not_eq: 0 } },
      }),
    ).toEqual({
      'filter[sent_status][eq]': '2',
      'filter[$op]': 'and',
      'filter[0][amount_unpaid][not_eq]': '0',
    });
  });

  it('builds read query params', () => {
    expect(
      buildApiReadQuery({
        filter: { company_id: '123' },
        include: ['company'],
        sort: ['-sent_on'],
        page: 2,
        per_page: 100,
      }),
    ).toEqual({
      'filter[company_id]': '123',
      include: 'company',
      sort: '-sent_on',
      'page[number]': '2',
      'page[size]': '100',
    });
  });

  it('validates filters and operators', () => {
    const { methodSpec } = resolveApiEndpoint('/invoices', 'GET');
    expect(() => validateFilterSpec({ sent_status: { eq: 2 } }, methodSpec)).not.toThrow();
    expect(() => validateFilterSpec({ nope: 'x' }, methodSpec)).toThrow('Invalid filter field');
    expect(() => validateFilterSpec({ sent_status: { contains: 2 } }, methodSpec)).toThrow(
      'Invalid operator',
    );
  });

  it('validates sort values', () => {
    const { methodSpec } = resolveApiEndpoint('/invoices', 'GET');
    expect(() => validateSort(['-sent_on'], methodSpec)).not.toThrow();
    expect(() => validateSort(['-nope'], methodSpec)).toThrow('Invalid sort field');
  });

  it('describes endpoints', () => {
    expect(describeApiEndpoint('/reports/invoice_reports')).toEqual({
      path: '/reports/invoice_reports',
      methods: [
        {
          method: 'GET',
          summary: 'Get invoice report rows',
          query: ['include', 'sort', 'page[number]', 'page[size]'],
          filters: {
            invoice_date_after: ['eq', 'contains'],
            invoice_date_before: ['eq', 'contains'],
            company_id: ['eq'],
          },
          sort: [],
          supports_body: false,
        },
      ],
    });
  });
});
