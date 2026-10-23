# Shipyard HQ — Technical Guide

[← Back to the project overview](../README.md)

Shipyard HQ is a launch intelligence network for independent builders. Makers can submit products, publish launches, collect upvotes, track analytics, and buy placement plans. Public users can browse launches, leaderboards, categories, tags, use cases, platforms, pricing models, alternatives, and maker profiles.

## Stack

- Next.js 16.4 App Router with Cache Components and Partial Prefetching
- React 19.3
- TypeScript
- Tailwind CSS 4
- Prisma 7 with PostgreSQL
- Clerk authentication
- Dodo Payments
- Redis and BullMQ for cache and background work
- Cloudflare Web Analytics and GraphQL Analytics API for traffic reporting
- Google Analytics for internal event and conversion collection
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

Public, auth, and member routes compile separate Tailwind stylesheets. Shared
animation utilities live in `app/tailwind-animations.css`, imported through
`app/tailwind-theme.css` by each entrypoint. Keep Tailwind `@utility` definitions
there so state variants are generated. `app/globals.css` contains browser CSS
and shared keyframes; it does not compile route utilities.

## Next.js 16.4 features

Partial Prefetching shares route shells across links. The public layout exports
`ensureStatic = "prefetch"` so both shells and explicit link prefetches use static
output; database and session work streams when the visitor navigates. Partner
Spotlight runs behind its own Suspense boundary and `navigation()` gate, allowing
the header, footer, and page to render independently of placement lookup.
Existing Valkey caches, tag invalidation, and the disabled per-process cache
remain in place.

Turbopack garbage collection, lazy client dynamic imports, and worker threads are
enabled. Next.js falls back to child processes on Node versions affected by the
upstream worker-thread issue. Security upgrade reminders are enabled. The existing
`npm run analyze` command uses the improved Turbopack bundle analyzer.

The experimental native Rust React Compiler is available with
`NEXT_RUST_REACT_COMPILER=1 npm run dev` or
`NEXT_RUST_REACT_COMPILER=1 npm run build`. Enable it consistently in build
environments when adopting it; omit the variable to roll back to normal
compilation. Agent feedback and additional dependency roots are not enabled.
No database migration is required for this upgrade.

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
- `NEXT_PUBLIC_APP_URL` - canonical, client-facing app URL. Production must use
  an absolute HTTPS origin such as `https://shipyardhq.dev`; container bind
  addresses such as `0.0.0.0` are invalid.
- `CACHE_ENV_PREFIX` - optional cache namespace prefix.
- `CRON_SECRET` - bearer token for protected cron/refresh endpoints.
- `PRODUCTS_API_TOKEN` - private bearer token for `GET /api/products`.
- `PRODUCTS_API_PLAN_ID` - Shipyard pricing `Plan.id` used by the products API
  (for example, the Pro plan's ID). This is not a Dodo product ID.

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

- `GOOGLE_ANALYTICS_ID` - GA4 measurement ID used by the production gtag and Measurement Protocol events.
- `GOOGLE_ANALYTICS_API_SECRET` - GA4 Measurement Protocol secret for server-side events.
- `GA_EXCLUDED_HOSTNAMES` - optional comma-separated hostnames that must not send browser events.
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ANALYTICS_START_DATE` - optional earliest reporting date.
- `CLOUDFLARE_ANALYTICS_RETENTION_DAYS` - optional raw HTTP retention window.
- `CLOUDFLARE_ANALYTICS_TIMEOUT_MS` - optional GraphQL request timeout.

Public SEO tools:

- `GOOGLE_PAGESPEED_API_KEY` - optional but recommended for dependable Core Web Vitals checks; without it, requests use Google's limited anonymous quota.

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
- `npm run build` - build the production app and package standalone static assets.
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
- `npm run prisma:seed:prod` - seed production taxonomy and plan-feature data.

## Data, Cache, and Background Work

The public homepage uses both Next.js revalidation and Redis-backed cache helpers. Product, plan, placement, billing, vote, analytics-ingestion, and cron refresh paths are expected to invalidate or refresh dependent homepage and analytics caches.

Historical leaderboard results expire 24 hours after they are cached. Reads do
not extend that lifetime, so obsolete generations expire even after version-based
invalidation. The active version marker remains persistent. When upgrading from
an older release, apply a one-time 24-hour expiration to historical leaderboard
payload keys that have no TTL, preserving their values and the version marker.
Scope that migration to the environment's `leaderboard:periodic:historical:v1:`
and `leaderboard:periodic:historical:v2:` namespaces; queues and other caches are
outside this policy.

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

## Authenticated Products API

`GET /api/products` lists published products whose assigned `Product.planId`
matches `PRODUCTS_API_PLAN_ID`. Configure both `PRODUCTS_API_TOKEN` and
`PRODUCTS_API_PLAN_ID` in `.env.local` or the server environment. The endpoint
returns `503` when either value is missing; it never falls back to all products.
No database migration is needed.

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $PRODUCTS_API_TOKEN" \
  "$NEXT_PUBLIC_APP_URL/api/products?limit=20"
```

Send the bearer header on every request, including subsequent pages.
Clerk sessions are not used for this endpoint. Missing or incorrect bearer tokens
return `401`. Responses are private and must not be cached.

The response shape is:

```json
{
  "items": [
    {
      "id": "product_example",
      "slug": "example",
      "name": "Example",
      "url": "https://shipyardhq.dev/products/example",
      "productUrl": "https://example.com",
      "tagline": "An example product",
      "description": "Full product description",
      "logo": "https://media.shipyardhq.dev/example.webp",
      "pricing": {
        "model": "subscription",
        "startingPriceCents": 1200,
        "currencyCode": "USD"
      },
      "plan": { "id": "plan_pro", "slug": "pro", "name": "Pro" }
    }
  ],
  "limit": 20,
  "hasMore": false,
  "nextCursor": null
}
```

`url` is the Shipyard listing; `productUrl` is the product's external website.
`pricing` describes the listed product, while `plan` describes its Shipyard
pricing plan. Unknown starting prices and currencies are `null`. Pricing models
are `free`, `freemium`, `subscription`, `one_time`, or `custom`.

`limit` defaults to 20 and accepts integers from 1 through 100. Products are
ordered by creation time descending, then ID descending. When another page
exists, `nextCursor` contains an opaque continuation token. Pass it as
`?limit=20&cursor=...`; treat cursors as opaque. `nextCursor` is `null` on the last
page, including an empty result. Invalid limits or cursors return `400`. Restart
pagination after changing `PRODUCTS_API_PLAN_ID`. Database failures return `500`.

Pagination tolerates a deleted boundary product. Each page reads current data;
products can enter or leave the result as their plan or publication status
changes. The filter uses the assigned plan projection maintained by billing;
it does not independently reconcile grants with Dodo.

## Analytics

Cloudflare Web Analytics is used for public traffic, product analytics reporting,
and scoring. Google Analytics remains enabled independently for internal event
and conversion collection. Cloudflare beacon and GraphQL API access are
documented in:

[Cloudflare Web Analytics setup](cloudflare-web-analytics.md).

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
- `.github/workflows/tests.yml` for generation, lint, type checks, Vitest, and native ARM64 image validation.
- `.github/workflows/security.yml` for gitleaks and npm audit.
- `.github/workflows/container.yml` for release-triggered container image builds.

The release image uses Node.js 26.12.1 on Alpine 3.24, pinned by digest, with
npm 11.19.1 with patched bundled brace-expansion 5.0.12 and undici 6.28.1,
plus current Alpine security updates. Local Clerk state and caches
are excluded from the Docker context. GNU tar is included for Fleet's
standalone artifact packaging and extraction. CI scans the complete image with
high/critical findings blocking publication, including findings without a fix.
The image generates Prisma's client and fetches its checksum-verified native CLI
engine during Docker build using an unused synthetic database URL. Runtime
generation and migration therefore need no external engine download.
The same native ARM64 image gate runs on every PR and release. It verifies Prisma
generation, Sharp, the profiler, Next.js SWC, Tailwind, cache retention, and GNU tar
artifact round-tripping. It then applies migrations to a disposable PostgreSQL 17
container, inserts synthetic fixtures, and builds and serves the real application.
HTTP checks cover the homepage, every referenced JS/CSS asset, authenticated
products pagination and plan isolation, unauthenticated rejection, private field
exclusion, and local image delivery. Native Sharp PNG/WebP conversion is checked
separately; the configured external media/CDN transformations need a separate
authorized integration check. The fixture network has no external egress;
no production credentials or data are used. Fixture containers and volumes are
removed on success or failure. The image retains npm and GNU tar because Fleet
builds standalone artifacts and runs workers from this full-source image.
Run it locally against a built image with
`bash scripts/ci/smoke-image.sh <image> <platform> <version>`.

Production deployments should provide database, Clerk, Dodo, Redis, analytics, storage, and cron secrets through the hosting environment. The image no longer builds the Next.js bundle during the GitHub container workflow. Instead, the container entrypoint runs `npm run prisma:generate` and `npm run build` at pod startup, then launches `.next/standalone/server.js`. This lets `NEXT_PUBLIC_*` values and server secrets come from the cluster only.

Next.js is locked to 16.4.2, including the upstream fix for `use cache` prerender
signal retention ([Next.js #98448](https://github.com/vercel/next.js/pull/98448)).
The previous 16.3.4 runtime exhausted its 3 GiB JavaScript heap even with
`cacheMaxMemorySize: 0`. Keep that cache setting and the existing heap/container
limits; verify the bundled Next.js version, fresh restart counts, and memory trend
under traffic after rebuilding the standalone artifact. Rollback uses the previous
image and matching build artifact, but restores the known memory-growth risk.

`npm run build` also copies `public` and `.next/static` into the standalone output,
after moving browser source maps into the private Faro directory. This makes the
standalone server ready to serve CSS, JavaScript, fonts, and public assets locally
as well as in Docker:

```bash
npm run build
node .next/standalone/server.js
```

Use `npm run build` for this workflow; bare `next build` does not run the asset
packaging steps. Restart an existing server after rebuilding.

The web container needs a writable `/app` directory at startup because it writes `.next` and generated Prisma client files. If a deployment uses `readOnlyRootFilesystem`, mount a writable volume for `/app` or keep the root filesystem writable for this image.

Keep the root `package.json` and `package-lock.json` package version pinned to
`0.0.0`. Update `release.json` for a release. Both PR and release image workflows
read that file; a release tag or manual version that disagrees fails before the
image build. `APP_VERSION` is applied only in the final Docker stage, preserving
the dependency install cache across version-only releases.

Publish only after the exact source has passed PR checks, through the approved
`Container Image` workflow. A published GitHub release triggers it automatically;
the explicit equivalent is:

```bash
gh workflow run container.yml --repo abhi1693/shipyardhq --ref 1.5.41 -f version=1.5.41
```

Direct publishing through `scripts/release-image.sh` fails closed so it cannot
bypass SBOM, strict HIGH/CRITICAL and secret scanning (including unfixed findings),
native smoke, provenance, and final tag promotion.

Before dispatch, verify that the release tag resolves to the exact validated
source commit. `gh workflow run --ref` accepts a branch or tag; use the immutable
release tag rather than a moving branch.

The script still supports local builds:

```bash
npm run release:image -- 1.5.41 --no-push --load
```

That command checks out the release tag into a temporary worktree, verifies its
version, and builds Linux/ARM64 without registry writes. Use `--no-checkout` only
for a local source-tree build. Historical tags without `release.json` remain
locally buildable. Publishing and GitOps deployment remain separate gates. A
Shipyard deployment must update web/init, worker, builder Job, cleanup CronJob,
and scheduled CronJob pins together; the Fleet builder applies migrations and
builds the standalone artifact before web/worker readiness is assessed.

## Security

- Keep secrets in `.env.local` locally and in your deployment secret manager in production.
- Do not log Clerk, Dodo, database, Redis, R2, OpenAI, or GA credentials.
- Webhook routes require their configured signing secrets.
- Cron-style endpoints require `CRON_SECRET`.

Additional security notes live in:

[SECURITY.md](../SECURITY.md).

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

The source repository is public, so signed GitHub artifact attestations remain
enabled and must verify against the exact release source and reusable signer
before GitOps deployment. Private GHCR package visibility does not disable this
source-repository capability.
