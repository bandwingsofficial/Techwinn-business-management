import assert from 'node:assert/strict';
import test from 'node:test';

import { canAccessDashboardWidgetModuleData } from '../dist/lib/contracts/dashboard-widgets.js';
import {
  DASHBOARD_TASKS_SUMMARY,
  hasDashboardPermission,
} from '../dist/lib/contracts/dashboard-permission-keys.js';

test('dashboard widget summary permission without task scope or module access is not accessible', () => {
  const effective = new Set([DASHBOARD_TASKS_SUMMARY]);
  assert.equal(canAccessDashboardWidgetModuleData(effective, 'tasks.kpi'), false);
  assert.equal(hasDashboardPermission(effective, DASHBOARD_TASKS_SUMMARY), true);
});

test('CRM widget requires leads module permission and dashboard CRM scope', () => {
  const summaryOnly = new Set(['dashboard.crm.summary']);
  assert.equal(canAccessDashboardWidgetModuleData(summaryOnly, 'crm.kpi'), false);

  const withModule = new Set([
    'dashboard.crm.summary',
    'crm.leads.view',
    'dashboard.crm.leads.assigned',
  ]);
  assert.equal(canAccessDashboardWidgetModuleData(withModule, 'crm.kpi'), true);
});

test('employee widgets require employees.view or employees.read', () => {
  const effective = new Set(['dashboard.employees.summary', 'employees.view']);
  assert.equal(canAccessDashboardWidgetModuleData(effective, 'employees.kpi'), true);

  const noModule = new Set(['dashboard.employees.summary']);
  assert.equal(canAccessDashboardWidgetModuleData(noModule, 'employees.kpi'), false);
});