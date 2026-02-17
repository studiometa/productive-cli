/**
 * Reports command entry point
 */

import { createCommandRouter } from '../../utils/command-router.js';
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
export const handleReportsCommand = createCommandRouter({
  resource: 'reports',
  handlers: {
    time: reportsTime,
    project: reportsProject,
    projects: reportsProject,
    budget: reportsBudget,
    budgets: reportsBudget,
    person: reportsPerson,
    people: reportsPerson,
    invoice: reportsInvoice,
    invoices: reportsInvoice,
    payment: reportsPayment,
    payments: reportsPayment,
    service: reportsService,
    services: reportsService,
    task: reportsTask,
    tasks: reportsTask,
    company: reportsCompany,
    companies: reportsCompany,
    deal: reportsDeal,
    deals: reportsDeal,
    timesheet: reportsTimesheet,
    timesheets: reportsTimesheet,
  },
});
