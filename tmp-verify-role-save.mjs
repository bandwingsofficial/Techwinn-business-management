import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(root, 'package.json'));
const { Client } = require(join(root, 'node_modules/.pnpm/pg@8.16.3/node_modules/pg'));
const env = readFileSync(new URL('./.env', import.meta.url), 'utf8');
const connectionString = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^"|"$/g, '');
const client = new Client({ connectionString });
await client.connect();

const role = await client.query(
  `SELECT id FROM organization_roles WHERE key = 'employee' LIMIT 1`,
);
const roleId = role.rows[0].id;

async function listKeys() {
  const rows = await client.query(
    `SELECT permission_key FROM organization_role_permissions WHERE role_id = $1 ORDER BY permission_key`,
    [roleId],
  );
  return rows.rows.map((r) => r.permission_key);
}

const before = await listKeys();
const intended = [...new Set([...before, 'tasks.update', 'projects.update'])].sort();

await client.query('BEGIN');
try {
  // Simulate Role Management save (replace set)
  await client.query(`DELETE FROM organization_role_permissions WHERE role_id = $1`, [roleId]);
  for (const permission_key of intended) {
    await client.query(
      `INSERT INTO organization_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
      [roleId, permission_key],
    );
  }
  const afterSave = await listKeys();

  // Simulate OLD bootstrap wipe (template only) — what used to happen
  const template = [
    'projects.read',
    'tasks.read',
    'daily_tasks.update_status',
    'daily_tasks.notes.create',
    'daily_tasks.notes.view_own',
    'daily_tasks.comment',
    'attendance.view_own',
    'attendance.punch_in',
    'attendance.punch_out',
    'attendance.view_summary',
    'attendance.manage_devices',
    'calendar.view',
    'leave.requests.create',
    'leave.requests.read_own',
    'leave.requests.cancel',
    'leave.balances.read_own',
  ];
  await client.query(`DELETE FROM organization_role_permissions WHERE role_id = $1`, [roleId]);
  for (const permission_key of template) {
    await client.query(
      `INSERT INTO organization_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
      [roleId, permission_key],
    );
  }
  const afterOldBootstrap = await listKeys();

  // Restore intended saved set (new behavior keeps this)
  await client.query(`DELETE FROM organization_role_permissions WHERE role_id = $1`, [roleId]);
  for (const permission_key of intended) {
    await client.query(
      `INSERT INTO organization_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
      [roleId, permission_key],
    );
  }
  const afterNewBehavior = await listKeys();

  await client.query('COMMIT');

  console.log(
    JSON.stringify(
      {
        beforeCount: before.length,
        intendedCount: intended.length,
        afterSaveMatches: JSON.stringify(afterSave) === JSON.stringify(intended),
        oldBootstrapWipedEdits: !afterOldBootstrap.includes('tasks.update'),
        newBehaviorKeepsEdits: afterNewBehavior.includes('tasks.update'),
        afterNewBehaviorCount: afterNewBehavior.length,
        hasTasksUpdate: afterNewBehavior.includes('tasks.update'),
        hasProjectsUpdate: afterNewBehavior.includes('projects.update'),
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}

await client.end();
