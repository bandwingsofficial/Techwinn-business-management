/**
 * Applies the full Prisma migration history to an empty PostgreSQL database and
 * verifies it matches schema.prisma (no drift).
 *
 * Usage (from apps/api or via pnpm filter):
 *   DATABASE_URL=postgresql://... pnpm db:migrate:validate
 *
 * Safety:
 * - Refuses to run if the target database already has user tables (unless
 *   MIGRATE_VALIDATE_ALLOW_NONEMPTY=1 — still never drops data).
 * - Never runs migrate reset / db push.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

const prismaDir = join(fileURLToPath(import.meta.url), '..', '..');
const apiDir = join(prismaDir, '..');

for (const envPath of [join(apiDir, '.env'), join(apiDir, '..', '..', '.env')]) {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
    break;
  }
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('DATABASE_URL is required for migration validation.');
  process.exit(1);
}

const allowNonEmpty = process.env.MIGRATE_VALIDATE_ALLOW_NONEMPTY === '1';

function runPrisma(args) {
  const result = spawnSync('pnpm', ['exec', 'prisma', ...args], {
    cwd: apiDir,
    env: process.env,
    encoding: 'utf8',
    shell: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`prisma ${args.join(' ')} failed with exit ${result.status ?? 'null'}`);
    process.exit(result.status ?? 1);
  }
  return result;
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  const { rows } = await client.query(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> '_prisma_migrations'
    ORDER BY c.relname
  `);

  if (rows.length > 0 && !allowNonEmpty) {
    console.error(
      `Refusing to validate: database already has ${rows.length} user table(s) (e.g. "${rows[0].table_name}").`,
    );
    console.error(
      'Use an empty disposable database. Set MIGRATE_VALIDATE_ALLOW_NONEMPTY=1 only when you intentionally re-validate a DB that already matches migrations.',
    );
    process.exit(1);
  }

  if (rows.length > 0) {
    console.warn(
      `MIGRATE_VALIDATE_ALLOW_NONEMPTY=1: continuing with ${rows.length} existing user table(s).`,
    );
  } else {
    console.log('Target database has no user tables — proceeding with migrate deploy.');
  }
} finally {
  await client.end();
}

console.log('\n==> prisma migrate deploy');
runPrisma(['migrate', 'deploy']);

console.log('\n==> prisma migrate status');
runPrisma(['migrate', 'status']);

console.log('\n==> prisma migrate diff (database vs schema.prisma)');
const diff = spawnSync(
  'pnpm',
  [
    'exec',
    'prisma',
    'migrate',
    'diff',
    '--from-config-datasource',
    '--to-schema',
    'prisma/schema.prisma',
    '--exit-code',
  ],
  {
    cwd: apiDir,
    env: process.env,
    encoding: 'utf8',
    shell: true,
  },
);
if (diff.stdout) process.stdout.write(diff.stdout);
if (diff.stderr) process.stderr.write(diff.stderr);

if (diff.status === 2) {
  console.error(
    'Schema drift detected: migrations produced a database that does not match schema.prisma.',
  );
  process.exit(2);
}
if (diff.status !== 0) {
  console.error(`prisma migrate diff failed with exit ${diff.status ?? 'null'}`);
  process.exit(diff.status ?? 1);
}

console.log('\nMigration validation passed: deploy succeeded, status clean, no schema drift.');
