# syntax=docker/dockerfile:1
# Build context: repository root
#   docker build -f docker/api/Dockerfile -t techwin-api .
#
# Coolify: Dockerfile path `docker/api/Dockerfile`, context = repository root.
# Contracts/validation live inside apps/api/src/lib after packages/ dissolve;
# only tooling (tsconfig/eslint) remains outside the app.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /repo

FROM base AS build
# Native deps for argon2 (and similar) during install/build only.
RUN apk add --no-cache python3 make g++ openssl
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY tooling/tsconfig tooling/tsconfig
COPY tooling/eslint tooling/eslint
RUN pnpm install --frozen-lockfile --filter @techwin/api...
COPY apps/api apps/api
# Prisma Client → Nest compile → self-contained deploy dir.
RUN pnpm --filter @techwin/api db:generate \
  && pnpm --filter @techwin/api build \
  && pnpm --filter @techwin/api deploy --prod --legacy /out

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat \
  && addgroup -S techwin \
  && adduser -S techwin -G techwin
WORKDIR /app
ENV NODE_ENV=production
# Runtime secrets (DATABASE_URL, JWT_*, AWS_*, etc.) come from the orchestrator
# (Coolify / Compose). Root `.env` is excluded by .dockerignore and is never COPY'd.
COPY --from=build --chown=techwin:techwin /out/ ./
USER techwin
EXPOSE 4000
# Nest enableShutdownHooks() handles SIGTERM (Prisma + Redis disconnect).
CMD ["node", "dist/main.js"]
