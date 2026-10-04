# syntax=docker/dockerfile:1

FROM node:22.23.2-alpine3.24@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Keep the shared build/runtime tools patched. Fleet requires GNU tar when
# creating and extracting its standalone build artifacts.
# Patch npm's bundled dependencies separately from the application lockfile.
RUN apk upgrade --no-cache \
  && apk add --no-cache ca-certificates openssl tar \
  && npm install --global npm@11.19.1 \
  && npm install --prefix /tmp/npm-security-patches \
    --no-save --ignore-scripts --package-lock=false \
    brace-expansion@5.0.12 undici@6.28.1 http-cache-semantics@4.3.0 \
  && for package in brace-expansion undici balanced-match http-cache-semantics; do \
    rm -rf "/usr/local/lib/node_modules/npm/node_modules/$package" && \
    cp -a "/tmp/npm-security-patches/node_modules/$package" \
      "/usr/local/lib/node_modules/npm/node_modules/$package" || exit 1; \
  done \
  && rm -rf /tmp/npm-security-patches \
  && npm cache clean --force \
  && rm -rf /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

FROM base AS deps

COPY package.json package-lock.json .npmrc ./
# Fleet builds Next.js in this image but does not run ESLint. Keep build/test
# tooling while excluding the lint-only chain containing unpatched braces.
RUN npm ci --ignore-scripts \
  && rm -rf node_modules/eslint-config-next node_modules/@next/eslint-plugin-next \
    node_modules/fast-glob node_modules/micromatch node_modules/braces

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN addgroup -S -g 1001 nodejs \
  && adduser -S -D -H -u 1001 -G nodejs nextjs

COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .
RUN mkdir -p /app/.next \
  && chown nextjs:nodejs /app /app/.next \
  && chmod +x /app/docker-entrypoint.sh

ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["web"]
