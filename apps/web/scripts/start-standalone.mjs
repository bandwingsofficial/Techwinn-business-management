
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const standaloneRoot = path.join(webRoot, '.next', 'standalone');
const serverEntry = path.join(
  standaloneRoot,
  'apps',
  'web',
  'server.js',
);

if (!existsSync(serverEntry)) {
  console.error(
    'Missing standalone build. Run `pnpm build` (or `pnpm --filter @techwin/web build`) first.',
  );
  process.exit(1);
}

const staticSource = path.join(webRoot, '.next', 'static');
const staticTarget = path.join(
  standaloneRoot,
  'apps',
  'web',
  '.next',
  'static',
);

if (!existsSync(staticTarget) && existsSync(staticSource)) {
  cpSync(staticSource, staticTarget, { recursive: true });
}

const publicSource = path.join(webRoot, 'public');
const publicTarget = path.join(
  standaloneRoot,
  'apps',
  'web',
  'public',
);

if (!existsSync(publicTarget) && existsSync(publicSource)) {
  cpSync(publicSource, publicTarget, { recursive: true });
}

// Render provides PORT dynamically.
// Always bind to all network interfaces.
const port = process.env.PORT ?? '3000';
const hostname = '0.0.0.0';

// Validate the production API upstream.
{
  const raw = (process.env.API_INTERNAL_URL ?? '')
    .trim()
    .replace(/\/+$/, '');

  if (!raw) {
    console.error(
      'API_INTERNAL_URL is required in production. Set it to your NestJS service URL.',
    );
    process.exit(1);
  }

  let parsed;

  try {
    parsed = new URL(raw);
  } catch {
    console.error(
      `API_INTERNAL_URL must be a valid absolute URL (got "${raw}").`,
    );
    process.exit(1);
  }

  if (
    parsed.protocol !== 'http:' &&
    parsed.protocol !== 'https:'
  ) {
    console.error(
      `API_INTERNAL_URL must use http: or https: (got "${parsed.protocol}").`,
    );
    process.exit(1);
  }

  const host = parsed.hostname;

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host === '::1'
  ) {
    console.error(
      `API_INTERNAL_URL must not use a loopback host in production (got "${host}").`,
    );
    process.exit(1);
  }
}

console.log(`Starting Next.js on ${hostname}:${port}`);

const child = spawn(
  process.execPath,
  [serverEntry],
  {
    cwd: standaloneRoot,
    env: {
      ...process.env,
      PORT: port,
      HOSTNAME: hostname,
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  },
);

child.on('error', (error) => {
  console.error('Failed to start Next.js server:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
