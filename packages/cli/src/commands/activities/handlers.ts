/**
 * CLI adapter for activities command handlers.
 */

import { formatActivity, formatListResponse } from '@studiometa/productive-api';
import {
  fromCommandContext,
  listActivities,
  type ListActivitiesOptions,
} from '@studiometa/productive-core';

import type { CommandContext } from '../../context.js';
import type { OutputFormat } from '../../types.js';

import { runCommand } from '../../error-handler.js';
import { render, createRenderContext } from '../../renderers/index.js';
import { parseFilters } from '../../utils/parse-filters.js';

function parseListOptions(ctx: CommandContext): ListActivitiesOptions {
  const options: ListActivitiesOptions = {};

  const additionalFilters: Record<string, string> = {};
  if (ctx.options.filter)
    Object.assign(additionalFilters, parseFilters(String(ctx.options.filter)));
  if (ctx.options.event) additionalFilters.event = String(ctx.options.event);
  if (ctx.options.after) additionalFilters.after = String(ctx.options.after);
  if (ctx.options.person) additionalFilters.person_id = String(ctx.options.person);
  if (ctx.options.project) additionalFilters.project_id = String(ctx.options.project);
  if (Object.keys(additionalFilters).length > 0) options.additionalFilters = additionalFilters;

  // Always include creator so we can display who performed the action
  options.include = ['creator'];

  const { page, perPage } = ctx.getPagination();
  options.page = page;
  options.perPage = perPage;

  return options;
}

export async function activitiesList(ctx: CommandContext): Promise<void> {
  const spinner = ctx.createSpinner('Fetching activities...');
  spinner.start();

  await runCommand(async () => {
    const execCtx = fromCommandContext(ctx);
    const result = await listActivities(parseListOptions(ctx), execCtx);

    spinner.succeed();

    const format = (ctx.options.format || ctx.options.f || 'human') as OutputFormat;
    const formattedData = formatListResponse(result.data, formatActivity, result.meta, {
      included: result.included,
    });

    if (format === 'csv' || format === 'table') {
      const data = result.data.map((a) => ({
        id: a.id,
        event: a.attributes.event,
        created_at: a.attributes.created_at,
      }));
      ctx.formatter.output(data);
    } else {
      const renderCtx = createRenderContext({ noColor: ctx.options['no-color'] === true });
      render('activity', format, formattedData, renderCtx);
    }
  }, ctx.formatter);
}
