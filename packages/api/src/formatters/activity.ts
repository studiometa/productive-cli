/**
 * Formatter for Activity resources
 */

import type { JsonApiResource, FormatOptions } from './types.js';

import { DEFAULT_FORMAT_OPTIONS } from './types.js';

export interface FormattedActivity {
  [key: string]: unknown;
  id: string;
  event: string;
  changeset: string;
  created_at: string;
  creator_id?: string;
  creator_name?: string;
}

/** Maximum length for a single field value representation */
const MAX_VALUE_LENGTH = 60;

/**
 * Format a single changeset value for display.
 * Handles primitives, objects with value/id, null, etc.
 */
function formatChangesetValue(val: unknown): string {
  if (val === null || val === undefined) {
    return 'null';
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    // Objects may carry a human-readable value
    if (obj.value !== undefined) return String(obj.value).slice(0, MAX_VALUE_LENGTH);
    if (obj.id !== undefined) return `#${obj.id}`;
    // Fallback: compact JSON
    const json = JSON.stringify(val);
    return json.length > MAX_VALUE_LENGTH ? json.slice(0, MAX_VALUE_LENGTH) + '…' : json;
  }
  const str = String(val);
  return str.length > MAX_VALUE_LENGTH ? str.slice(0, MAX_VALUE_LENGTH) + '…' : str;
}

/**
 * Convert a raw changeset array into a readable string.
 *
 * Input:  [{"name": [null, "SLA Basic"]}, {"price": [0, 4900]}]
 * Output: "name: null → 'SLA Basic', price: 0 → 4900"
 */
export function formatChangeset(changeset: Array<Record<string, [unknown, unknown]>>): string {
  const parts: string[] = [];

  for (const entry of changeset) {
    for (const [field, [oldVal, newVal]] of Object.entries(entry)) {
      const oldStr = formatChangesetValue(oldVal);
      const newStr = formatChangesetValue(newVal);
      // Wrap string values in quotes for clarity
      const fmtOld = typeof oldVal === 'string' ? `'${oldStr}'` : oldStr;
      const fmtNew = typeof newVal === 'string' ? `'${newStr}'` : newStr;
      parts.push(`${field}: ${fmtOld} → ${fmtNew}`);
    }
  }

  return parts.join(', ');
}

/**
 * Get included resource by type and id
 */
function getIncludedResource(
  included: JsonApiResource[] | undefined,
  type: string,
  id: string | undefined,
): Record<string, unknown> | undefined {
  if (!included || !id) return undefined;
  return included.find((r) => r.type === type && r.id === id)?.attributes;
}

/**
 * Format an Activity resource for output.
 *
 * One-liner example:
 *   [create] 2026-02-22 10:30 by John Doe — name: null → 'SLA Basic', price: 0 → 4900
 */
export function formatActivity(
  activity: JsonApiResource,
  options: FormatOptions = {},
): FormattedActivity {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };
  const attrs = activity.attributes;

  const creatorId = activity.relationships?.creator?.data?.id;
  const creatorData = getIncludedResource(opts.included, 'people', creatorId);

  const changesetRaw = (attrs.changeset ?? []) as Array<Record<string, [unknown, unknown]>>;
  const changesetStr = formatChangeset(changesetRaw);

  const result: FormattedActivity = {
    id: activity.id,
    event: String(attrs.event ?? ''),
    changeset: changesetStr,
    created_at: String(attrs.created_at ?? ''),
  };

  if (opts.includeRelationshipIds && creatorId) {
    result.creator_id = creatorId;
  }

  if (creatorData) {
    result.creator_name = `${creatorData.first_name} ${creatorData.last_name}`;
  }

  return result;
}
