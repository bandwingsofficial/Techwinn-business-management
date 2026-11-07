# Coolify deployment (Bluehost VPS)

Production-oriented runbook for deploying Techwin independently as **API** and **Web** services on Coolify.

Repository: `bandwingsofficial/Techwinn-business-management`  
Branch: `main`

| Public surface | Domain |
|----------------|--------|
| API | `https://api2.techwinn.com` |
| Web / CRM | `https://crm.techwinn.com` |

Related: [DEPLOYMENT.md](../DEPLOYMENT.md), [environment-variables.md](./environment-variables.md), [BACKUP-RECOVERY.md](../BACKUP-RECOVERY.md).

---

## Frontend ↔ API communication (required reading)

| Path | URL |
|------|-----|
| Browser → Web | `https://crm.techwinn.com/api/v1/...` (same-origin) |
| Web container → API | Runtime `API_INTERNAL_URL` + `/api/v1/...` (Coolify internal hostname) |
| Public API (health, webhooks, optional direct clients) | `https://api2.techwinn.com/api/v1/...` |

- Leave **`NEXT_PUBLIC_API_BASE_URL` empty** so the browser never talks cross-origin to `api2` (preserves `SameSite=Strict` cookies + CSRF).
- Set **`API_INTERNAL_URL`** on the **Web** service at **runtime** to the Coolify-internal API URL (not localhost). Do not invent the hostname — copy it from Coolify’s API service networking panel.
- Set **`WEB_ORIGIN=https://crm.techwinn.com`** on the **API** service (CORS + origin checks).

Local development uses a **single repository-root `.env`**. Production does **not** use that file.

---

## 1. Prerequisites

1. Coolify + Docker on the VPS.
2. GitHub connected for deploys.
3. DNS:
   - `api2.techwinn.com` → VPS / Coolify proxy
   - `crm.techwinn.com` → VPS / Coolify proxy
4. AWS S3 + IAM for production storage.
5. Persistent Coolify **PostgreSQL** and **Redis** (never delete volumes).

---

## 2. PostgreSQL and Redis

1. Create PostgreSQL (16–18) and Redis 7 in Coolify.
2. Keep them **internal** (not public).
3. Paste Coolify’s displayed internal URLs into the API’s `DATABASE_URL` and `REDIS_URL`.
4. Suggested pool on ~2 vCPU / ~3.8 GB with one API replica: `DATABASE_POOL_MAX=5`.

---

## 3. API service

| Setting | Value |
|---------|--------|
| Repository | `bandwingsofficial/Techwinn-business-management` |
| Branch | `main` |
| Build Pack | Dockerfile |
| Base Directory | `/` |
| Dockerfile | `docker/api/Dockerfile` |
| Exposed Port | `4000` |
| Domain | `https://api2.techwinn.com` |

### Environment (API only)

```text
NODE_ENV=production
API_HOST=0.0.0.0
API_PORT=4000
TRUST_PROXY=1
LOG_PRETTY=false
LOG_LEVEL=info
COOKIE_SECURE=true
SWAGGER_ENABLED=false
DATABASE_URL=<internal Postgres URL from Coolify>
DATABASE_POOL_MAX=5
REDIS_URL=<internal Redis URL from Coolify>
WEB_ORIGIN=https://crm.techwinn.com
JWT_ACCESS_SECRET=<pnpm secrets:generate>
JWT_ISSUER=techwin-api
JWT_AUDIENCE=techwin-platform-admin
TOTP_ENCRYPTION_KEY=<base64 32-byte key>
TOTP_ISSUER=Techwin
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…
AWS_REGION=ap-south-1
AWS_S3_BUCKET=…
DISTRIBUTED_LOCK_STRICT=true
```

Optional WhatsApp / SMTP: see [environment-variables.md](./environment-variables.md).

### Health checks (API)

| Probe | Path |
|-------|------|
| Liveness | `GET /api/v1/health` |
| Readiness | `GET /api/v1/ready` |

### Migrations (not during image build)

```bash
node node_modules/prisma/build/index.js migrate deploy
```

Once per release. Never `migrate dev` / `db push` / `migrate reset` on production.

---

## 4. Web service

| Setting | Value |
|---------|--------|
| Repository | `bandwingsofficial/Techwinn-business-management` |
| Branch | `main` |
| Build Pack | Dockerfile |
| Base Directory | `/` |
| Dockerfile | `docker/web/Dockerfile` |
| Exposed Port | `3000` |
| Domain | `https://crm.techwinn.com` |

### Runtime environment (Web only)

```text
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
API_INTERNAL_URL=http://<coolify-api-service-hostname>:4000
NEXT_PUBLIC_API_BASE_URL=
```

`API_INTERNAL_URL` is **server-only** (App Router `/api/v1` proxy at **runtime**).

- Set it as a Coolify **runtime** environment variable — **not** a Docker build argument.
- It is **not** compiled into `next.config` rewrites (rewrites are intentionally unused so the hostname is not frozen at image build time).
- It is **not** a `NEXT_PUBLIC_*` value and never appears in browser bundles.
- Do **not** use `localhost` / `127.0.0.1` (production refuses loopback).
- Do **not** use the public `https://api2.techwinn.com` URL unless you intentionally want the web container to egress via the public network.
- Missing or invalid values fail process start (`instrumentation`) and return `503 PROXY_MISCONFIGURED` from the proxy.

### Health check (Web)

`GET /login` on port 3000.

---

## 5. SSL and proxy

- Attach domains; enable TLS at Coolify.
- API: `TRUST_PROXY=1`.
- API: `WEB_ORIGIN=https://crm.techwinn.com`.

---

## 6. Deployment order

1. Build/roll API → run `migrate deploy` once → verify `https://api2.techwinn.com/api/v1/ready`.
2. Set Web **runtime** `API_INTERNAL_URL` to the internal API host → roll Web (rebuild only if the web image itself changed; hostname changes do not require a rebuild).
3. Verify `https://crm.techwinn.com/login`, login, and a CRM/task page load.

### Rollback

Redeploy previous image tags. Schema: restore DB backup or ship a forward fix migration ([BACKUP-RECOVERY.md](../BACKUP-RECOVERY.md)).

---

## 7. Data durability

Postgres and Redis volumes must survive redeploys. S3 lives outside the VPS. Never delete production volumes during cleanup.

---

## 8. Workspace / Docker notes

- Build context: repo root.
- API image: `pnpm deploy --prod --legacy` with catalog/contracts/validation.
- Web image: Next standalone; `/api/v1` proxied at **runtime**.
- Images never contain `.env`.
