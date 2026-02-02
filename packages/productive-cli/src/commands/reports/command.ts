/**
 * Reports command entry point
 */

import type { OutputFormat } from '../../types.js';

import { createContext, type CommandOptions } from '../../context.js';
import { OutputFormatter } from '../../output.js';
import {
  reportsTime,
  reportsProject,
  reportsBudget,
  reportsPerson,
  reportsInvoice,
  reportsPayment,
  reportsService,
  reportsTask,
  reportsCompany,
  reportsDeal,
  reportsTimesheet,
} from './handlers.js';

/**
 * Handle reports command
 */
export async function handleReportsCommand(
  subcommand: string,
  args: string[],
  options: Record<string, string | boolean>,
): Promise<void> {
  const format = (options.format || options.f || 'human') as OutputFormat;
  const formatter = new OutputFormatter(format, options['no-color'] === true);

  const ctx = createContext(options as CommandOptions);

  switch (subcommand) {
    case 'time':
      await reportsTime(ctx);
      break;
    case 'project':
    case 'projects':
      await reportsProject(ctx);
      break;
    case 'budget':
    case 'budgets':
      await reportsBudget(ctx);
      break;
    case 'person':
    case 'people':
      await reportsPerson(ctx);
      break;
    case 'invoice':
    case 'invoices':
      await reportsInvoice(ctx);
      break;
    case 'payment':
    case 'payments':
      await reportsPayment(ctx);
      break;
    case 'service':
    case 'services':
      await reportsService(ctx);
      break;
    case 'task':
    case 'tasks':
      await reportsTask(ctx);
      break;
    case 'company':
    case 'companies':
      await reportsCompany(ctx);
      break;
    case 'deal':
    case 'deals':
      await reportsDeal(ctx);
      break;
    case 'timesheet':
    case 'timesheets':
      await reportsTimesheet(ctx);
      break;
    default:
      formatter.error(`Unknown reports subcommand: ${subcommand}`);
      console.log(
        'Available report types: time, project, budget, person, invoice, payment, service, task, company, deal, timesheet',
      );
      process.exit(1);
  }
}
