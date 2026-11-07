import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

/**
 * Local monorepo development uses a single repository-root `.env`.
 * Next.js only auto-loads `apps/web/.env*`, so load the root file here when present.
 * Existing process env (Coolify, Docker, shell) always wins — Node's
 * `loadEnvFile` does not overwrite set variables. Production images do not contain `.env`.
 */
function loadRootEnvFile(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../../.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (file) process.loadEnvFile(file);
}

loadRootEnvFile();

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

/**
 * Same-origin API reverse proxy architecture
 * ------------------------------------------
 * Browser calls:  `/api/v1/*` on the web origin (crm.techwinn.com / localhost:3000).
 * Upstream Nest:  runtime `API_INTERNAL_URL` + `/api/v1/*` (server-only).
 *
 * Intentionally NOT using `rewrites()` here:
 * - Rewrites bake the destination at build time; Coolify internal hostnames change
 *   without wanting a web image rebuild.
 * - App Router `src/app/api/v1/[...path]/route.ts` forwards methods, query, body,
 *   headers, status codes, and multi-value `Set-Cookie` at runtime.
 *
 * Coolify / Docker: set `API_INTERNAL_URL` as a **runtime** environment variable
 * (not a build arg, not `NEXT_PUBLIC_*`). Example: `http://<api-service>:4000`.
 * Production refuses loopback and missing values (see `resolveApiInternalUrl` +
 * `src/instrumentation.ts`).
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '..', '..'),
  poweredByHeader: false,
  reactStrictMode: true,
  redirects() {
    return [
      { source: '/admin', destination: '/admin/dashboard', permanent: false },
      { source: '/project-manager', destination: '/project-manager/dashboard', permanent: false },
    ]; 
  },
  headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
