# Shipyard HQ

Shipyard HQ is a launch intelligence network for independent builders. Makers can submit products, publish launches, collect upvotes, track analytics, and buy placement plans. Public users can browse launches, leaderboards, categories, tags, use cases, platforms, pricing models, alternatives, and maker profiles.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7 with PostgreSQL
- Clerk authentication
- Dodo Payments
- Redis and BullMQ for cache and background work
- Google Analytics / GA4 Data API for traffic reporting
- Cloudflare R2-compatible object storage for product media

## Project Layout

- `app/` - App Router routes, layouts, API handlers, and route-local components.
- `actions/` - server actions for member, public, catalog, and product workflows.
- `components/` - shared UI organized by atoms, molecules, templates, pages, and layout.
- `lib/` - shared runtime logic, data access, cache helpers, analytics, billing, jobs, and utilities.
- `prisma/` - Prisma schema, migrations, and seed files.
- `bin/` - long-running worker entrypoints.
- `docs/` - operational setup notes.
- `scripts/` - manual utility scripts.
- `tests/` - Vitest coverage.

## Requirements

- Node.js 22 or newer
- npm
- PostgreSQL
- Redis for production-like caching, scheduled work, and BullMQ jobs

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with at least the core app secrets:

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."
DODO_API_KEY="..."
```

3. Apply Prisma migrations and generate the client:

```bash
npm run prisma:deploy
npm run prisma:generate
```

4. Seed local data when needed:

```bash
npm run prisma:seed:dev
```

5. Start the development server:

```bash
npm run dev
```

The app runs at `http://localhost:3000` by default.

## Environment Variables

Core:

- `DATABASE_URL` - primary PostgreSQL connection string.
- `DIRECT_DATABASE_URL` - optional direct database URL override.
- `NEXT_PUBLIC_APP_URL` - canonical app URL.
- `CACHE_ENV_PREFIX` - optional cache namespace prefix.
- `CRON_SECRET` - bearer token for protected cron/refresh endpoints.

Auth:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`

Payments:

- `DODO_API_KEY`
- `DODO_ENV`
- `DODO_WEBHOOK_SECRET`
- `MONTHLY_WINNER_PLAN_SLUG`

Redis and jobs:

- `REDIS_URL` or `REDIS_TLS_URL`
- `REDIS_DB`
- `REDIS_CONNECT_TIMEOUT_MS`
- `REDIS_SENTINEL_NODES`
- `REDIS_SENTINEL_NAME`
- `BULLMQ_PREFIX`

Analytics:

- `GOOGLE_ANALYTICS_ID`
- `GOOGLE_ANALYTICS_API_SECRET`
- `GA_PROPERTY_ID`
- `GA_CREDENTIALS_JSON`
- `GA_SERVICE_ACCOUNT_JSON`
- `SHIPYARD_GA4_SERVICE_ACCOUNT_JSON_BASE64`
- `GA4_SERVICE_ACCOUNT_JSON_BASE64`
- `GA_EXCLUDED_HOSTNAMES`

Storage:

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL`

Media optimization:

- `IMGPROXY_ENDPOINT` - public HTTPS imgproxy endpoint, for example `https://img.shipyardhq.dev`.
- `IMGPROXY_KEY` - hex-encoded imgproxy signing key.
- `IMGPROXY_SALT` - hex-encoded imgproxy signing salt.

AI:

- `OPENAI_API_KEY`

Development seed overrides:

- `DEV_ADMIN_CLERK_ID`
- `DEV_ADMIN_EMAIL`
- `DEV_MEMBER_CLERK_ID`
- `DEV_MEMBER_EMAIL`
- `DEV_GENERATED_PRODUCT_COUNT`

## npm Scripts

- `npm run dev` - start the Next.js dev server.
- `npm run build` - build the production app.
- `npm run build:ci` - build and run the main Prisma seed.
- `npm start` - serve a built app.
- `npm run worker` - start the Shipyard background worker.
- `npm run lint` - run ESLint.
- `npm run format` - run Prettier over the repo.
- `npm run test` - run Vitest.
- `npm run test:watch` - run Vitest in watch mode.
- `npm run test:ci` - run Vitest once for CI.
- `npm run prisma:deploy` - apply deployed Prisma migrations.
- `npm run prisma:generate` - regenerate the Prisma client.
- `npm run prisma:migrate:reset` - reset the database with Prisma.
- `npm run prisma:seed` - run the main seed.
- `npm run prisma:seed:dev` - seed local development data.
- `npm run prisma:seed:categories` - seed categories.
- `npm run prisma:seed:usecases` - seed use cases.
- `npm run prisma:seed:plan-features` - seed plan features.
- `npm run prisma:seed:plans` - seed plans.
- `npm run prisma:seed:alternatives` - seed alternatives.
- `npm run prisma:seed:rewards` - seed rewards.
- `npm run prisma:seed:prod` - seed production taxonomy and plan-feature data.

## Data, Cache, and Background Work

The public homepage uses both Next.js revalidation and Redis-backed cache helpers. Product, plan, placement, billing, vote, analytics-ingestion, and cron refresh paths are expected to invalidate or refresh dependent homepage and analytics caches.

Protected homepage refresh endpoint:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "$NEXT_PUBLIC_APP_URL/api/homepage/refresh"
```

The worker entrypoint is:

```bash
npm run worker
```

Use it in production when scheduled jobs, BullMQ queues, cache refresh tasks, and placement/plan expiration work should run outside web requests.

## Analytics

Google Analytics is used for public traffic and product analytics reporting. GA4 Data API access is documented in:

```text
docs/ga4-data-api-access.md
```

Manual read-only GA4 sanity check:

```bash
GA4_PROPERTY_ID="123456789" \
SHIPYARD_GA4_SERVICE_ACCOUNT_JSON_BASE64="..." \
npx tsx scripts/ga4-sanity.ts
```

## Media Storage

Uploaded product media is stored through an S3-compatible R2 client. Configure the R2 environment variables listed above before enabling uploads in production.

Managed media served from `media.shipyardhq.dev` is routed through the first-party Next image optimizer URL and redirected to signed imgproxy URLs by the app proxy. Configure `IMGPROXY_ENDPOINT`, `IMGPROXY_KEY`, and `IMGPROXY_SALT` in the web runtime so signing stays server-side.

## Quality Checks

Run these before shipping application changes:

```bash
npm run lint
npm run test:ci
npm run build
```

Use `npm run format` when formatting drift is expected.

## Deployment

The repository includes:

- `Dockerfile` for container images.
- `.github/workflows/tests.yml` for Vitest CI.
- `.github/workflows/security.yml` for gitleaks and npm audit.
- `.github/workflows/container.yml` for release-triggered container image builds.

Production deployments should provide database, Clerk, Dodo, Redis, analytics, storage, and cron secrets through the hosting environment. The image no longer builds the Next.js bundle during the GitHub container workflow. Instead, the container entrypoint runs `npm run prisma:generate` and `npm run build` at pod startup, then launches `.next/standalone/server.js`. This lets `NEXT_PUBLIC_*` values and server secrets come from the cluster only.

The web container needs a writable `/app` directory at startup because it writes `.next` and generated Prisma client files. If a deployment uses `readOnlyRootFilesystem`, mount a writable volume for `/app` or keep the root filesystem writable for this image.

Keep the root `package.json` and `package-lock.json` package version pinned to `0.0.0`. Release versions come from GitHub release tags and image tags, with `APP_VERSION` applied only in the final Docker stage. This keeps version-only releases from invalidating the dependency install cache layer.

## Security

- Keep secrets in `.env.local` locally and in your deployment secret manager in production.
- Do not log Clerk, Dodo, database, Redis, R2, OpenAI, or GA credentials.
- Webhook routes require their configured signing secrets.
- Cron-style endpoints require `CRON_SECRET`.

Additional security notes live in:

```text
SECURITY.md
```

## Useful Public Routes

- `/` - homepage and latest launches
- `/browse` - product discovery
- `/leaderboard` - current leaderboard
- `/categories` - category index
- `/tags` - tag index
- `/use-cases` - use-case index
- `/platforms` - platform index
- `/pricing` - pricing model index
- `/alternatives` - alternatives index
- `/users` - maker directory
- `/analytics` - public analytics view
- `/member/products` - member product management
- `/admin` - admin area
