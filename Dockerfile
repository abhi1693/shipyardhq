# syntax=docker/dockerfile:1

FROM node:22.21.1-bookworm-slim AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps

FROM base AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG BUILD_DATABASE_URL=postgresql://shipyardhq:shipyardhq@localhost:5432/shipyardhq
ARG BUILD_DIRECT_DATABASE_URL=$BUILD_DATABASE_URL
ARG BUILD_DODO_ENV=test_mode
ARG BUILD_DODO_VALUE=dodo_build_placeholder

ENV NODE_OPTIONS=--max-old-space-size=4096

RUN --mount=type=secret,id=vercel_env,required=false \
  node -e '\
    const fs = require("fs");\
    const { spawnSync } = require("child_process");\
    if (fs.existsSync("/run/secrets/vercel_env")) require("dotenv").config({ path: "/run/secrets/vercel_env" });\
    process.env.DATABASE_URL ||= process.env.BUILD_DATABASE_URL;\
    process.env.DIRECT_DATABASE_URL ||= process.env.DATABASE_URL || process.env.BUILD_DIRECT_DATABASE_URL || process.env.BUILD_DATABASE_URL;\
    const result = spawnSync("npx", ["prisma", "generate"], { stdio: "inherit", env: process.env });\
    process.exit(result.status ?? 1);\
  '
RUN --mount=type=secret,id=vercel_env,required=false \
  node -e '\
    const fs = require("fs");\
    const { spawnSync } = require("child_process");\
    if (fs.existsSync("/run/secrets/vercel_env")) require("dotenv").config({ path: "/run/secrets/vercel_env" });\
    process.env.DATABASE_URL ||= process.env.BUILD_DATABASE_URL;\
    process.env.DIRECT_DATABASE_URL ||= process.env.DATABASE_URL || process.env.BUILD_DIRECT_DATABASE_URL || process.env.BUILD_DATABASE_URL;\
    process.env.DODO_ENV ||= process.env.BUILD_DODO_ENV;\
    process.env.DODO_API_KEY ||= process.env.BUILD_DODO_VALUE;\
    const result = spawnSync("npm", ["run", "build"], { stdio: "inherit", env: process.env });\
    process.exit(result.status ?? 1);\
  '

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
