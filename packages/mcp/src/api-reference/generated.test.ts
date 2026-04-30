import { describe, expect, it } from 'vitest';

import { PRODUCTIVE_API_REFERENCE } from './generated.js';

describe('PRODUCTIVE_API_REFERENCE', () => {
  it('contains broad endpoint coverage from the Productive spec', () => {
    expect(Object.keys(PRODUCTIVE_API_REFERENCE).length).toBeGreaterThan(150);
    expect(PRODUCTIVE_API_REFERENCE['/activities']).toBeDefined();
    expect(PRODUCTIVE_API_REFERENCE['/time_entries']).toBeDefined();
    expect(PRODUCTIVE_API_REFERENCE['/invoices']).toBeDefined();
    expect(PRODUCTIVE_API_REFERENCE['/reports/invoice_reports']).toBeDefined();
  });

  it('includes method metadata for templated endpoints', () => {
    expect(PRODUCTIVE_API_REFERENCE['/tasks/{id}']?.methods.PATCH?.supportsBody).toBe(true);
    expect(PRODUCTIVE_API_REFERENCE['/tasks/{id}']?.methods.GET?.pathParams).toHaveProperty('id');
  });
});
