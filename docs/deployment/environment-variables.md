# Environment variables (production)

Canonical inventory of variables used by the Techwin API and web app. Values are validated by `apps/api/src/config/env.schema.ts` at API startup (fail-fast; secret values are never printed).

Also see repository-root [`.env.example`](../../.env.example) and [ENVIRONMENT.md](../ENVIRONMENT.md).

**Never** put secrets in Docker build args, image layers, `NEXT_PUBLIC_*` variables, or committed `.env` files. Configure secrets only in Coolify (or equivalent) runtime environment.

---

## API (NestJS)

### Required in production

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | Must be `production` |
| `DATABASE_URL` | `postgresql://…` to Coolify/internal Postgres — **not** `localhost` inside containers |
| `REDIS_URL` | `redis://` or `rediss://` |
| `WEB_ORIGIN` | Public HTTPS origin of the admin UI (e.g. `https://crm.techwinn.com`) |
| `JWT_ACCESS_SECRET` | ≥ 48 characters in production |
| `TOTP_ENCRYPTION_KEY` | Base64 32-byte key; not the `.env.example` placeholder |
| `TRUST_PROXY` | Behind Coolify/Traefik: `1` or `true` (not `loopback` / `false`) |
| `LOG_PRETTY` | Must be `false` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Required when storage is S3 (production default) |

### Recommended

| Variable | Suggested production value |
|----------|----------------------------|
| `API_HOST` | `0.0.0.0` |
| `API_PORT` | `4000` |
| `DATABASE_POOL_MAX` | `5` on a ~4 GB VPS with a single API replica (default schema max is 10) |
| `COOKIE_SECURE` | `true` |
| `SWAGGER_ENABLED` | `false` |
| `DISTRIBUTED_LOCK_STRICT` | `true` if multiple API replicas |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Keep defaults unless coordinating clients |
| `TOTP_ISSUER` | Product display name for authenticator apps |
| `AWS_REGION` / `AWS_S3_BUCKET` | Match your bucket |
| `CORS_ALLOWED_ORIGINS` | Only if extra HTTPS origins beyond `WEB_ORIGIN` |

### Optional integrations

Leave unset until needed (schema keeps them optional):

- WhatsApp / Meta: `WHATSAPP_*`, `META_*`
- SMTP: set `EMAIL_TRANSPORT=smtp` plus `SMTP_HOST`, `SMTP_FROM`, etc.
- Workers: `WHATSAPP_WORKER_ENABLED`, `MEDIA_CLEANUP_WORKER_ENABLED`, quotation expiration flags

### CLI-only (not required for API HTTP process)

`PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, `PLATFORM_ADMIN_NAME` — seed / bootstrap only.

---

## Web (Next.js)

| Variable | When | Notes |
|----------|------|--------|
| `NODE_ENV` | Runtime | `production` |
| `PORT` | Runtime | `3000` (Coolify) |
| `HOSTNAME` | Runtime | `0.0.0.0` |
| `API_INTERNAL_URL` | **Build arg** | Internal Docker/Coolify URL of the API, e.g. `http://<api-service>:4000`. Compiled into Next rewrites. Not a secret. |
| `NEXT_PUBLIC_API_BASE_URL` | Optional runtime | Leave **empty** so the browser uses same-origin `/api/v1` (recommended). Never put secrets here. |

Do not set `DATABASE_URL`, JWT, or AWS keys on the web service.

---

## Docker Compose host interpolation only

Used by `docker-compose.yml` for the Postgres service definition (not API schema):

`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `WEB_PORT`, `API_PUBLISH_PORT`

Compose overrides `DATABASE_URL` / `REDIS_URL` inside the API container to use service DNS (`postgres`, `redis`).
