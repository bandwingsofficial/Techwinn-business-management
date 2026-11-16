CREATE TABLE IF NOT EXISTS "organization_admin_dashboard_layouts" (
  "organization_id" UUID NOT NULL,
  "admin_id" UUID NOT NULL,
  "widget_order" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "hidden_widgets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organization_admin_dashboard_layouts_pkey" PRIMARY KEY ("organization_id", "admin_id"),
  CONSTRAINT "organization_admin_dashboard_layouts_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_admin_dashboard_layouts_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT r."id", 'dashboard.view'
FROM "organization_roles" r
WHERE r."portal_slug" IN ('super-admin', 'super_admin', 'employee', 'admin', 'project-manager')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT r."id", 'dashboard.overview.summary'
FROM "organization_roles" r
WHERE r."portal_slug" IN ('super-admin', 'super_admin', 'admin', 'project-manager')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'dashboard.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN (
  'project_management.daily_tasks.view',
  'crm.leads.view',
  'projects.read',
  'employees.view',
  'attendance.records.view',
  'leave.management.view',
  'leave.requests.read_own'
)
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'dashboard.tasks.summary'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN ('project_management.daily_tasks.view', 'tasks.read')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'dashboard.tasks.assigned'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'tasks.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'dashboard.tasks.team'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'project_management.daily_tasks.view'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'dashboard.tasks.all'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'project_management.daily_tasks.view'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", key
FROM "organization_role_permissions" p
CROSS JOIN (VALUES
  ('dashboard.crm.summary'),
  ('dashboard.crm.leads.all')
) AS keys(key)
WHERE p."permission_key" = 'crm.leads.view'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", key
FROM "organization_role_permissions" p
CROSS JOIN (VALUES
  ('dashboard.projects.summary'),
  ('dashboard.projects.all'),
  ('dashboard.projects.progress')
) AS keys(key)
WHERE p."permission_key" = 'projects.read'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", key
FROM "organization_role_permissions" p
CROSS JOIN (VALUES
  ('dashboard.employees.summary'),
  ('dashboard.employees.statistics')
) AS keys(key)
WHERE p."permission_key" = 'employees.view'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", key
FROM "organization_role_permissions" p
CROSS JOIN (VALUES
  ('dashboard.attendance.summary'),
  ('dashboard.attendance.team')
) AS keys(key)
WHERE p."permission_key" = 'attendance.records.view'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", key
FROM "organization_role_permissions" p
CROSS JOIN (VALUES
  ('dashboard.attendance.own'),
  ('dashboard.attendance.summary')
) AS keys(key)
WHERE p."permission_key" = 'attendance.punch.view'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", key
FROM "organization_role_permissions" p
CROSS JOIN (VALUES
  ('dashboard.leave.summary'),
  ('dashboard.leave.own'),
  ('dashboard.leave.balance')
) AS keys(key)
WHERE p."permission_key" IN ('leave.requests.read_own', 'leave.balances.read_own')
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", key
FROM "organization_role_permissions" p
CROSS JOIN (VALUES
  ('dashboard.leave.summary'),
  ('dashboard.leave.requests.all')
) AS keys(key)
WHERE p."permission_key" = 'leave.management.view'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", key
FROM "organization_roles" r
CROSS JOIN (
  SELECT unnest(ARRAY[
    'dashboard.view',
    'dashboard.overview.summary',
    'dashboard.tasks.summary',
    'dashboard.tasks.all',
    'dashboard.tasks.team',
    'dashboard.tasks.assigned',
    'dashboard.crm.summary',
    'dashboard.crm.leads.all',
    'dashboard.crm.leads.team',
    'dashboard.crm.leads.assigned',
    'dashboard.projects.summary',
    'dashboard.projects.all',
    'dashboard.projects.assigned',
    'dashboard.projects.progress',
    'dashboard.employees.summary',
    'dashboard.employees.statistics',
    'dashboard.attendance.summary',
    'dashboard.attendance.team',
    'dashboard.attendance.own',
    'dashboard.leave.summary',
    'dashboard.leave.requests.all',
    'dashboard.leave.own',
    'dashboard.leave.balance',
    'dashboard.finance.summary',
    'dashboard.finance.revenue',
    'dashboard.finance.expense',
    'dashboard.finance.outstanding',
    'dashboard.reports.summary',
    'dashboard.reports.performance'
  ]::text[]) AS key
) keys
WHERE r."portal_slug" IN ('super-admin', 'super_admin')
ON CONFLICT DO NOTHING;