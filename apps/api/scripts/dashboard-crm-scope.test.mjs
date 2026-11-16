import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCrmDashboardScope } from '../dist/lib/contracts/dashboard-widgets.js';

test('resolveCrmDashboardScope picks organization when all CRM scope permissions are present', () => {
  const effective = new Set([
    'dashboard.crm.leads.assigned',
    'dashboard.crm.leads.team',
    'dashboard.crm.leads.all',
  ]);
  assert.equal(resolveCrmDashboardScope(effective), 'organization');
});

test('resolveCrmDashboardScope picks assigned when only assigned permission is present', () => {
  const effective = new Set(['dashboard.crm.leads.assigned']);
  assert.equal(resolveCrmDashboardScope(effective), 'assigned');
});

test('resolveCrmDashboardScope picks team over assigned', () => {
  const effective = new Set(['dashboard.crm.leads.assigned', 'dashboard.crm.leads.team']);
  assert.equal(resolveCrmDashboardScope(effective), 'team');
});