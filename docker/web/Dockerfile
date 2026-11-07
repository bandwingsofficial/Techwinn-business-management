# syntax=docker/dockerfile:1
# Build context: repository root
#   docker build -f docker/web/Dockerfile -t techwin-web .
#
# Browser calls stay same-origin (`/api/v1/*`). The App Router proxies to Nest
# using runtime `API_INTERNAL_URL` (Coolify/Compose env — NOT a build arg,
# NOT baked into next.config rewrites, NOT exposed to the browser).
# Root `.env` is never copied (.dockerignore).

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/catalog/package.json packages/catalog/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/tsconfig packages/tsconfig
COPY packages/eslint-config packages/eslint-config
COPY packages/scripts/package.json packages/scripts/package.json
RUN pnpm install --frozen-lockfile --filter @techwin/web...
COPY packages/catalog packages/catalog
COPY packages/contracts packages/contracts
COPY packages/validation packages/validation
COPY apps/web apps/web
# Leave NEXT_PUBLIC_API_BASE_URL unset so the browser uses same-origin `/api/v1`.
RUN pnpm --filter @techwin/catalog build \
  && pnpm --filter @techwin/contracts build \
  && pnpm --filter @techwin/validation build \
  && pnpm --filter @techwin/web build

FROM node:22-alpine AS runner
RUN addgroup -S techwin \
  && adduser -S techwin -G techwin
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# API_INTERNAL_URL must be supplied at container runtime (Compose/Coolify).
# Production refuses to start / proxy without a non-loopback http(s) origin.
COPY --from=build --chown=techwin:techwin /repo/apps/web/.next/standalone ./
COPY --from=build --chown=techwin:techwin /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=techwin:techwin /repo/apps/web/public ./apps/web/public
USER techwin
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
