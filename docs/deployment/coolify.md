# Coolify deployment (Bluehost VPS)

Production-oriented runbook for deploying Techwin independently as **API** and **Web** services on Coolify. Domains below match the intended public hosts; adjust if your DNS differs.

Repository: `bandwingsofficial/Techwinn-business-management`  
Branch: `main`

Related: [DEPLOYMENT.md](../DEPLOYMENT.md), [environment-variables.md](./environment-variables.md), [BACKUP-RECOVERY.md](../BACKUP-RECOVERY.md).

---

## 1. Prerequisites

1. Coolify installed on the VPS (Docker already required).
2. GitHub app / deploy key connected so Coolify can clone the private or public repo.
3. DNS:
   - `api.techwinn.com` → VPS / Coolify proxy
   - `crm.techwinn.com` → VPS / Coolify proxy
4. AWS S3 bucket + IAM user for production object storage.
5. Persistent Coolify resources for **PostgreSQL** and **Redis** (do not delete volumes).

---

## 2. Create PostgreSQL and Redis in Coolify

1. Create a **PostgreSQL** database resource (16+; 18 is fine if offered).
2. Create a **Redis** resource (7.x). Prefer AOF/persistence if Coolify exposes the option.
3. **Do not** publish Postgres or Redis on the public internet. Keep them on Coolify’s internal network.
4. From each resource’s Coolify UI, copy the **internal connection URL** Coolify shows (hostnames are Coolify-generated — do not invent them). Typical patterns look like service names on an internal Docker network; always paste the value Coolify displays into `DATABASE_URL` / `REDIS_URL`.

Suggested API pool size on a ~2 vCPU / ~3.8 GB VPS with one API replica: `DATABASE_POOL_MAX=5`.

---

## 3. API service

| Setting | Value |
|---------|--------|
| Repository | `bandwingsofficial/Techwinn-business-management` |
| Branch | `main` |
| Build Pack | Dockerfile |
| Base Directory | `/` (repository root) |
| Dockerfile | `docker/api/Dockerfile` |
| Exposed Port | `4000` |
| Domain | `https://api.techwinn.com` |

### Environment (API)

Set in Coolify (examples — use your real secrets):

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

Optional WhatsApp / SMTP variables: see [environment-variables.md](./environment-variables.md).

### Health checks (API)

| Probe | Path |
|-------|------|
| Liveness | `GET /api/v1/health` |
| Readiness | `GET /api/v1/ready` |

Configure Coolify healthcheck to readiness if the UI allows a path; otherwise use `/api/v1/health` for process liveness and rely on `/ready` during smoke tests after deploy.

### Migrations (controlled step — not image build)

After a successful API image build, **before** or **immediately as** traffic cuts over to a release that needs new schema:

```bash
# One-off / pre-deploy command inside the API container (Coolify “Execute command” or pre-deploy hook):
node node_modules/prisma/build/index.js migrate deploy
```

Rules:

- Use **`prisma migrate deploy` only** (never `migrate dev`, never `db push`, never `migrate reset` on production).
- Run **once per release**, not on every replica boot.
- If migrate fails, **stop the rollout**.

Prisma Client is generated at **image build** time; migrations are applied at **deploy** time against runtime `DATABASE_URL`.

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

### Build argument

| Arg | Value |
|-----|--------|
| `API_INTERNAL_URL` | Internal HTTP URL of the API service Coolify created, e.g. `http://<api-container-or-service-name>:4000` |

Copy the hostname from Coolify’s API service networking panel. Wrong hostnames break `/api/v1` rewrites (login/CSRF will fail).

### Runtime environment (Web)

```text
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_API_BASE_URL=
```

Leave `NEXT_PUBLIC_API_BASE_URL` empty so browsers call same-origin `/api/v1` (proxied to the API).

### Health check (Web)

`GET /login` (or `/`) on port 3000.

---

## 5. SSL and reverse proxy

- Attach domains in Coolify; enable Let’s Encrypt (or your certificate provider).
- Terminate TLS at Coolify/Traefik.
- API must have `TRUST_PROXY=1` (or equivalent hop count) so client IPs and secure cookies work.
- `WEB_ORIGIN` must be the public HTTPS CRM origin.

---

## 6. Deployment order

1. Build API image.
2. Run `migrate deploy` once against production DB.
3. Roll out API (restart / new container).
4. Verify `https://api.techwinn.com/api/v1/ready`.
5. Build web with correct `API_INTERNAL_URL`.
6. Roll out web; verify `https://crm.techwinn.com/login`.
7. Smoke: login, one CRM read, one task calendar read.

### Rollback

1. Redeploy previous **API** and **web** image tags in Coolify.
2. Schema: Prisma does not auto-down-migrate — restore Postgres from backup or ship a forward fix migration ([BACKUP-RECOVERY.md](../BACKUP-RECOVERY.md)).

---

## 7. Data durability

| Data | Persistence |
|------|-------------|
| PostgreSQL | Coolify volume / managed DB — **never** delete the volume during cleanup |
| Redis | Volume or managed Redis; business data is in Postgres (Redis may be cold after recreate) |
| S3 | Outside the VPS — configure bucket versioning separately |
| Secrets | Coolify env store / password manager |

Container recreation and image updates must not wipe Postgres volumes.

---

## 8. Backups

Configure outside the app:

- Daily Postgres backups + restore test quarterly
- S3 versioning
- Documented secret escrow for JWT / TOTP / WhatsApp encryption keys

See [BACKUP-RECOVERY.md](../BACKUP-RECOVERY.md).

---

## 9. Workspace / Docker build notes

- Build context is always the **repo root** (Coolify Base Directory `/`).
- API image runs `pnpm deploy --prod --legacy` and must include workspace packages **catalog**, **contracts**, and **validation** (see `docker/api/Dockerfile`).
- Web image builds Next.js `output: 'standalone'` and includes the same shared packages.
- Images do not contain `.env` files; `.dockerignore` excludes them.
