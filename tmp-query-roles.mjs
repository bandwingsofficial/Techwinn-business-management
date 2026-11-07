import pg from 'pg';

const client = new pg.Client({
  connectionString: 'postgresql://postgres:241013@localhost:5432/techwin_db',
});

await client.connect();

const members = await client.query(`
  SELECT pa.id::text AS admin_id, pa.email, pa.display_name, pa.role AS platform_role,
         om.organization_id::text AS organization_id, om.is_owner,
         r.key AS role_key, r.name AS role_name,
         e.id::text AS employee_id
  FROM platform_admins pa
  JOIN organization_memberships om ON om.admin_id = pa.id
  JOIN organization_membership_roles omr ON omr.membership_id = om.id
  JOIN organization_roles r ON r.id = omr.role_id
  LEFT JOIN employees e ON e.platform_admin_id = pa.id AND e.organization_id = om.organization_id
  WHERE r.key IN ('project_manager','project_management','employee','admin','owner','sales','financial','member')
  ORDER BY r.key, pa.email
`);
console.log('MEMBERS:');
console.log(JSON.stringify(members.rows, null, 2));

const perms = await client.query(`
  SELECT r.key AS role_key, rp.permission_key
  FROM organization_roles r
  JOIN organization_role_permissions rp ON rp.role_id = r.id
  WHERE r.key IN ('project_manager','project_management','employee','sales','financial','member')
  ORDER BY r.key, rp.permission_key
`);
console.log('PERMISSIONS BY ROLE:');
const byRole = {};
for (const row of perms.rows) {
  (byRole[row.role_key] ??= []).push(row.permission_key);
}
console.log(JSON.stringify(byRole, null, 2));

await client.end();
