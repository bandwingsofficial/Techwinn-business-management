INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'employee_leave_records.view'
FROM "organization_role_permissions" p
WHERE p."permission_key" IN (
  'leave.balances.read',
  'leave.balances.adjust',
  'leave_balances.view'
)
ON CONFLICT DO NOTHING;