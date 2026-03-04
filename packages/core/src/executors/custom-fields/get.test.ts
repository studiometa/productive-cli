import { describe, expect, it, vi } from 'vitest';

import { createTestExecutorContext } from '../../context/test-utils.js';
import { getCustomField } from './get.js';

const mockResponse = {
  data: {
    id: '42236',
    type: 'custom_fields',
    attributes: {
      name: 'Semaine',
      data_type_id: 3,
      customizable_type: 'Task',
      archived: false,
      required: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
    },
  },
  included: [
    {
      id: '417421',
      type: 'custom_field_options',
      attributes: { value: '2026-09', archived: false },
    },
  ],
};

describe('getCustomField', () => {
  it('calls getCustomField with id and default include', async () => {
    const getCustomFieldApi = vi.fn().mockResolvedValue(mockResponse);
    const ctx = createTestExecutorContext({ api: { getCustomField: getCustomFieldApi } });

    await getCustomField({ id: '42236' }, ctx);

    expect(getCustomFieldApi).toHaveBeenCalledWith('42236', { include: ['options'] });
  });

  it('allows overriding includes', async () => {
    const getCustomFieldApi = vi.fn().mockResolvedValue(mockResponse);
    const ctx = createTestExecutorContext({ api: { getCustomField: getCustomFieldApi } });

    await getCustomField({ id: '42236', include: [] }, ctx);

    expect(getCustomFieldApi).toHaveBeenCalledWith('42236', { include: [] });
  });

  it('returns data and included from response', async () => {
    const getCustomFieldApi = vi.fn().mockResolvedValue(mockResponse);
    const ctx = createTestExecutorContext({ api: { getCustomField: getCustomFieldApi } });

    const result = await getCustomField({ id: '42236' }, ctx);

    expect(result.data.attributes.name).toBe('Semaine');
    expect(result.included).toHaveLength(1);
  });
});
