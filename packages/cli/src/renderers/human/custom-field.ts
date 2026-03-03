/**
 * Human-readable renderer for custom fields
 *
 * Displays custom field definitions with name, type, and options.
 */

import type { FormattedCustomField, FormattedPagination } from '@studiometa/productive-api';

import type { ListRenderer, RenderContext } from '../types.js';

import { colors } from '../../utils/colors.js';

/**
 * Renderer for a list of custom fields with pagination
 */
export class HumanCustomFieldListRenderer implements ListRenderer<FormattedCustomField> {
  render(
    data: { data: FormattedCustomField[]; meta?: FormattedPagination },
    ctx: RenderContext,
  ): void {
    for (const field of data.data) {
      this.renderItem(field, ctx);
    }

    if (data.meta) {
      this.renderPagination(data.meta, ctx);
    }
  }

  renderItem(field: FormattedCustomField, _ctx: RenderContext): void {
    const archived = field.archived ? colors.dim(' [archived]') : '';
    const required = field.required ? colors.yellow(' *') : '';
    const typeLabel = colors.cyan(`[${field.data_type}]`);

    console.log(`${colors.bold(field.name)}${required} ${typeLabel}${archived}`);
    console.log(`  ${colors.dim(`ID: ${field.id} | Type: ${field.customizable_type}`)}`);

    if (field.description) {
      console.log(`  ${colors.dim(String(field.description))}`);
    }

    if (field.options && Array.isArray(field.options)) {
      const options = field.options as Array<{ value: string; id: string; archived: boolean }>;
      const activeOptions = options.filter((o) => !o.archived);
      if (activeOptions.length > 0) {
        const values = activeOptions.map((o) => o.value).join(', ');
        console.log(`  Options: ${values}`);
      }
    }

    console.log();
  }

  renderPagination(meta: FormattedPagination, _ctx: RenderContext): void {
    console.log(colors.dim(`Page ${meta.page}/${meta.total_pages} (Total: ${meta.total_count})`));
  }
}

/**
 * Singleton instance for convenience
 */
export const humanCustomFieldListRenderer = new HumanCustomFieldListRenderer();
