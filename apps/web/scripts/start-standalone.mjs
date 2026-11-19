import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standaloneRoot = path.join(webRoot, '.next', 'standalone');
const serverEntry = path.join(standaloneRoot, 'apps', 'web', 'server.js');

if (!existsSync(serverEntry)) {
  console.error(
    'Missing standalone build. Run `pnpm build` (or `pnpm --filter @techwin/web build`) first.',
  );
  process.exit(1);
}

const staticTarget = path.join(standaloneRoot, 'apps', 'web', '.next', 'static');
if (!existsSync(staticTarget)) {
  cpSync(path.join(webRoot, '.next', 'static'), staticTarget, { recursive: true });
}

const publicTarget = path.join(standaloneRoot, 'apps', 'web', 'public');
if (!existsSync(publicTarget) && existsSync(path.join(webRoot, 'public'))) {
  cpSync(path.join(webRoot, 'public'), publicTarget, { recursive: true });
}

const port = process.env.PORT ?? '3000';
const hostname = process.env.HOSTNAME ?? '0.0.0.0';

// Fail before spawning the server when production proxy upstream is missing/invalid.
// Mirrors `resolveApiInternalUrl` / `src/instrumentation.ts` (kept inline so this
// script stays plain JS without TypeScript imports).
{
  const raw = (process.env.API_INTERNAL_URL ?? '').trim().replace(/\/+$/, '');
  if (!raw) {
    console.error(
      'API_INTERNAL_URL is required in production. Set it to the NestJS service URL on the Docker/Coolify network (e.g. http://<api-hostname>:4000).',
    );
    process.exit(1);
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    console.error(`API_INTERNAL_URL must be a valid absolute URL (got "${raw}").`);
    process.exit(1);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    console.error(`API_INTERNAL_URL must use http: or https: (got "${parsed.protocol}").`);
    process.exit(1);
  }
  const host = parsed.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
    console.error(
      `API_INTERNAL_URL must not use a loopback host in production (got "${host}").`,
    );
    process.exit(1);
  }
}

const child = spawn(process.execPath, [serverEntry], {
  cwd: standaloneRoot,
  env: { ...process.env, PORT: port, HOSTNAME: hostname, NODE_ENV: 'production' },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
