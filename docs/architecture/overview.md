# Techwin architecture

Techwin is a pnpm workspace with two applications and shared packages:

- `@techwin/api` — NestJS modular monolith (PostgreSQL via Prisma, Redis, platform auth)
- `@techwin/web` — Next.js App Router admin UI
- `apps/api/src/lib/contracts` + `apps/web/src/lib/contracts` — HTTP shapes, error codes, route constants (duplicated per app)
- `apps/api/src/lib/validation` + `apps/web/src/lib/validation` — Zod schemas (duplicated per app)
- `apps/web/src/lib/catalog` — web-only catalog option data
- `tooling/tsconfig`, `tooling/eslint`, `scripts/` — repository tooling (not a runtime package)

## API layers

Each feature module (today: `auth`, `health`) follows a strict dependency direction:

```text
presentation → application → domain
infrastructure → domain contracts
shared infrastructure → domain contracts (via security.contracts.ts)
```

- **Domain** owns entities, value objects, repository contracts, and domain errors. It does not import NestJS, Prisma, HTTP, or environment loaders.
- **Application** owns one folder per use case (`login-with-password`, `verify-totp`, …) sitting directly under `application/`. Handlers orchestrate domain contracts and the technical ports in `infrastructure/security/security.contracts.ts`.
- **Infrastructure** implements persistence (Prisma), TOTP encryption, and rate limiting.
- **Presentation** maps HTTP to use cases: controllers, DTOs, cookies, guards.

`pnpm check:architecture` enforces these rules, plus: no spec/test files, Dockerfiles only under `docker/`.

## Authentication

Password login never creates a session. It issues a short-lived, single-use challenge (HttpOnly cookie). TOTP verification consumes the challenge, creates a session, sets a rotating refresh cookie and a readable CSRF cookie, and returns a 15-minute access token in the JSON body.

The browser keeps the access token in memory only. Reloads restore it through `POST /api/v1/auth/platform/refresh` using the refresh cookie and CSRF header. Reuse of a rotated refresh token revokes the session.

`pnpm db:seed` synchronizes the sole Platform Super Admin from `PLATFORM_ADMIN_*` in `.env`. Those variables are server-only (never `NEXT_PUBLIC_*`) and are not part of HTTP process configuration.

The web app talks to `/api/v1/*` on its own origin. An App Router handler proxies those paths to Nest via runtime `API_INTERNAL_URL` so cookies stay first-party (`SameSite=Strict`).

## Docker

- API image: `docker/api/Dockerfile` (context = repository root)
- Web image: `docker/web/Dockerfile` (context = repository root)
- Compose: `docker-compose.yml`

PostgreSQL data lives in the named volume `techwin_postgres_data`. Compose never deletes volumes.
