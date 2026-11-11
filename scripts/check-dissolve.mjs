#!/usr/bin/env node
/**
 * Dissolve acceptance gates: apps must not depend on a shared packages/ runtime.
 * Broader layer/cycle rules remain in check-architecture.mjs.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const violations = [];

/** @param {string} filePath */
const rel = (filePath) => path.relative(repoRoot, filePath).split(path.sep).join('/');

/**
 * @param {string} directory
 * @param {(filePath: string) => boolean} predicate
 */
function walk(directory, predicate) {
  if (!existsSync(directory)) return [];
  /** @type {string[]} */
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist' ||
      entry.name === '.next' ||
      entry.name === 'generated'
    ) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath, predicate));
    else if (predicate(fullPath)) files.push(fullPath);
  }
  return files;
}

if (existsSync(path.join(repoRoot, 'packages'))) {
  violations.push('packages/ directory still exists');
}

for (const required of [
  'docker/api/Dockerfile',
  'docker/web/Dockerfile',
  'apps/api/src/lib/contracts/index.ts',
  'apps/api/src/lib/validation/index.ts',
  'apps/web/src/lib/contracts/index.ts',
  'apps/web/src/lib/validation/index.ts',
  'apps/web/src/lib/catalog/index.ts',
  'tooling/tsconfig/nestjs.json',
  'tooling/eslint/base.js',
  'pnpm-workspace.yaml',
]) {
  if (!existsSync(path.join(repoRoot, required))) {
    violations.push(`missing required path: ${required}`);
  }
}

const workspace = readFileSync(path.join(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
if (/packages\//.test(workspace) || /packages\s*\*/.test(workspace)) {
  violations.push('pnpm-workspace.yaml still declares packages/*');
}
if (!/apps\/\*/.test(workspace)) {
  violations.push('pnpm-workspace.yaml must include apps/*');
}

const forbiddenImport = /from\s+['"](?:\.\.\/)*packages\/|require\(['"](?:\.\.\/)*packages\//;
const sourceFiles = walk(path.join(repoRoot, 'apps'), (file) =>
  /\.(tsx?|mts|mjs|js)$/.test(file),
);
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  if (forbiddenImport.test(text)) {
    violations.push(`packages/ path import in ${rel(file)}`);
  }
  if (/from\s+['"]@techwin\/(?:eslint-config|tsconfig|scripts)['"]/.test(text)) {
    violations.push(`removed tooling package import in ${rel(file)}`);
  }
}

// API must not import @techwin/* workspace aliases (uses #contracts / #validation).
for (const file of walk(path.join(repoRoot, 'apps', 'api', 'src'), (f) => /\.tsx?$/.test(f))) {
  const text = readFileSync(file, 'utf8');
  if (/from\s+['"]@techwin\/(?:contracts|validation|catalog)(?:\/[^'"]*)?['"]/.test(text)) {
    violations.push(`API still imports @techwin/* package alias: ${rel(file)}`);
  }
}

// Ensure web path aliases point at local lib, not a missing package.
const webTsconfig = JSON.parse(
  readFileSync(path.join(repoRoot, 'apps', 'web', 'tsconfig.json'), 'utf8'),
);
const paths = webTsconfig.compilerOptions?.paths ?? {};
for (const [alias, targets] of Object.entries(paths)) {
  if (!alias.startsWith('@techwin/')) continue;
  for (const target of targets) {
    const cleaned = target.replace(/\/\*$/, '');
    const resolved = path.resolve(path.join(repoRoot, 'apps', 'web'), cleaned);
    if (!existsSync(resolved)) {
      violations.push(`web tsconfig alias ${alias} → missing ${target}`);
    }
  }
}

if (violations.length > 0) {
  console.error(`Dissolve check failed with ${violations.length} violation(s):`);
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log(
  'Dissolve check passed: packages/ removed, app-local libs present, Dockerfiles under docker/*/.',
);
