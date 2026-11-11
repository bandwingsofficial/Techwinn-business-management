# Techwin API architecture

Techwin is a **pnpm monorepo** with two independently buildable apps: a NestJS API (`apps/api`) and Next.js admin (`apps/web`). Contracts and validation schemas live as app-local libraries under each app’s `src/lib/` (duplicated where both need them). There is no shared runtime `packages/` directory.

This document describes the **backend** architecture. The web app consumes HTTP APIs defined in its local `@techwin/contracts` path alias (`apps/web/src/lib/contracts`) and must not duplicate route strings ad hoc.

## Layered module structure

Each feature module under `apps/api/src/modules/<name>/` follows a dependency direction inspired by clean/hexagonal architecture:

```text
presentation/http  →  application  →  domain
        ↓                  ↓
   (mappers, DTOs)    infrastructure/persistence
```

| Layer | Responsibility | May import |
|-------|----------------|------------|
| **domain** | Business rules, policies, repository **interfaces**, ports, domain errors, value objects | Same module `domain/` only |
| **application** | Use cases: commands, queries, handlers, orchestration | Same module `domain/` and `application/`; cross-module via **public `index.ts`** or platform contracts |
| **infrastructure** | Prisma repositories, adapters, cache, external APIs | Same module `domain/` contracts; implements ports |
| **presentation** | Controllers, HTTP DTOs (Zod), guards, response mappers | Same module `application/` + `domain/`; **never Prisma** |

Shared cross-cutting code lives outside modules:

- `apps/api/src/config/` — environment validation (`env.schema.ts`, `AppConfig`)
- `apps/api/src/infrastructure/` — database, cache, storage, security helpers
- `apps/api/src/common/` — global filters, middleware, validation pipe
- `apps/api/src/platform/` — tenant context guards shared by org-scoped routes
- `apps/api/src/lib/contracts/` — route paths and response TypeScript types (API copy; web has its own under `apps/web/src/lib/contracts/`)

## Request flow

```text
HTTP → Controller → Zod DTO → Command/Query → Handler
  → Domain policy/service (optional)
  → Repository port / application port
  → Prisma repository (infrastructure)
  → PostgreSQL
```

Responses map domain/application records back through **presentation mappers** to contract-shaped JSON. Errors use the shared `{ statusCode, error, details? }` envelope (`GlobalExceptionFilter` + module filters).

## Prisma access rule

**Prisma is only used in:**

- `modules/*/infrastructure/persistence/**`
- `apps/api/src/infrastructure/database/prisma.service.ts`
- Prisma CLI scripts under `apps/api/prisma/`

Application handlers and controllers **must not** import `@prisma/client`, generated client paths, or `PrismaService`. Static enforcement: `scripts/check-architecture.mjs`.

## Module communication

- **Cross-module imports** must go through `modules/<other>/index.ts` (public API).
- **Org Access** exports `PermissionCheckerService`, `RequirePermissionsGuard`, `MEMBER_ACCOUNT_TRANSACTION` port, etc.
- **Media** exports `StoredFileService` for uploads and presigned reads.
- **Auth** exports guards and TOTP policies for platform authentication.
- **CRM** exports `CRM_REPOSITORY` for tenant bootstrap edge cases used by platform tenant context.

Avoid `forwardRef`; cycles indicate a boundary violation to fix.

## Multi-tenancy

Organization-scoped routes resolve **trusted** `organizationId` from membership context (guards + platform tenant context), not from unvalidated client body fields alone.

Repositories scope reads/writes with `organizationId` in Prisma `where` clauses. Permission checks run at presentation (guards) and application boundaries.

Platform Super Admin flows use separate auth paths without org tenant context.

## Background jobs

Workers run **inside the API process** (no separate worker binary):

- **WhatsAppJobRunner** — webhook retries, outbound delivery, broadcasts
- **StoredObjectCleanupJobRunner** — S3 delete retries from `storage_cleanup_jobs`

Both use **Redis distributed locks** (`RedisExclusiveLockService`). Default behavior runs work if Redis lock acquisition fails; set `DISTRIBUTED_LOCK_STRICT=true` for multi-replica production to skip ticks instead.

## Error handling

- Module-specific filters map domain errors to HTTP status + `ApiErrorCode`
- `GlobalExceptionFilter` catches remainder; 500 responses are generic to clients
- Prisma connection errors map to 503 where appropriate

## App-local libraries (no shared `packages/`)

| Location | Role |
|---------|------|
| `apps/api/src/lib/contracts` (`#contracts`) | API route constants, DTO types, error codes |
| `apps/api/src/lib/validation` (`#validation`) | API Zod schemas |
| `apps/web/src/lib/contracts` (`@techwin/contracts` path alias) | Web copy of contracts |
| `apps/web/src/lib/validation` (`@techwin/validation` path alias) | Web copy of Zod schemas |
| `apps/web/src/lib/catalog` (`@techwin/catalog` path alias) | Web-only catalog option data |
| `tooling/*`, `scripts/` | Repo tooling only (not a runtime dependency) |

## Enforcement

```bash
pnpm check:dissolve
pnpm check:architecture
```

`check:dissolve` confirms `packages/` is gone and each app embeds its own libs while Docker remains at `docker/api` and `docker/web`. `check:architecture` enforces layer and module boundaries (some legacy CRM/org-access cycles remain as known debt).

## Related documents

- [MODULE-REFERENCE.md](./MODULE-REFERENCE.md) — per-module map
- [API-REFERENCE.md](./API-REFERENCE.md) — route index
- [DEPLOYMENT.md](./DEPLOYMENT.md) — production operations
- [ENVIRONMENT.md](./ENVIRONMENT.md) — configuration
