# Shipyard Product Insights Developer Guide

## System overview

- The insights system builds a Product Insight Profile for each product by running a staged pipeline that crawls the product site, gathers community signals, and synthesizes an executive report.
- Pipeline stages are defined in TypeScript and executed sequentially with dependency awareness; results are persisted in Prisma tables for reuse across the web UI and emails.
- Work is coordinated through a Redis-backed queue triggered by user actions, background events, and scheduled crons.

## Data flow & storage

1. A pipeline run is requested (member action, admin action, product-created event, or cron) and the job is enqueued in Redis via `enqueueProductInsightPipelineJob` (`lib/server/productInsights/pipelineQueue.ts:42`).
2. The cron worker pulls jobs (`app/api/cron/product-insight-pipeline/route.ts:32`) and executes `runProductInsightPipeline` (`lib/server/productInsights/pipelineRunner.ts:455`).
3. Each stage writes or updates a `ProductInsightStageResult` row and updates the parent `ProductInsightProfile` record (`prisma/schema.prisma:249`).
4. Serialized views are produced with `serializeInsightProfile` for delivery to the UI and emails (`lib/server/productInsights/profile.ts:270`).

**Core tables**

- `ProductInsightProfile`: one per product, tracks overall status, last run, and holds stage relations (`prisma/schema.prisma:249`).
- `ProductInsightStageResult`: JSON payload per stage/provider with metrics, status, and timestamps (`prisma/schema.prisma:265`).
- Stage data is raw JSON; always deserialize with the helpers in `lib/server/productInsights/profile.ts` to stay type-safe.

## Pipeline orchestration

- **Stage registry:** Runtime stages live in `lib/server/productInsights/pipeline/stages/*.ts`; they are gathered in `PIPELINE_STAGES_IN_ORDER` (`lib/server/productInsights/pipeline/stages/index.ts:1`).
- **Stage metadata & sets:** Presentation labels, descriptions, and named stage sets are defined in `lib/server/productInsights/stages.ts:12`. Stage sets (`default`, `snapshot-only`, `reddit-refresh`, `report-refresh`) drive both UI choices and scheduling contracts.
- **Run planning:** `determinePipelineRunPlan` decides which stages need to execute based on dependencies, freshness, and forced selections (`lib/server/productInsights/pipelineRunner.ts:179`).
- **Execution:** `runProductInsightPipeline` ensures dependencies exist, retries stages per policy, updates Prisma rows, and sends completion email notifications (`lib/server/productInsights/pipelineRunner.ts:455`).
- **Queue semantics:** Redis keys `productInsights:pipeline:v1:queue` and `productInsights:pipeline:v1:active` ensure a product is processed once at a time (`lib/server/productInsights/pipelineQueue.ts:39`). Failed attempts are retried until `maxAttempts` is exceeded, after which the job is marked failed and dropped.
- **Automatic triggers:**
  - Newly created products enqueue a default run via the `product.created` event listener (`lib/server/productInsights/initialPipeline.ts:8`).
  - Stale profiles are rescheduled by `scheduleStaleProductInsightPipelines` (`lib/server/productInsights/pipelineAutoScheduler.ts:52`) which feeds the `/api/cron/product-insight-refresh` endpoint (`app/api/cron/product-insight-refresh/route.ts:10`).
  - Cron schedules live in `vercel.json` (`vercel.json:13`).

## Stage catalogue

Each stage implements the `PipelineStage` contract (`lib/server/productInsights/pipeline/types.ts:28`). Key stages:

- **product.snapshot** – Crawls the product website and synthesizes a structured summary (`lib/server/productInsights/pipeline/stages/productSnapshotStage.ts:17`). Produces sitemap metadata, page snapshots, and derived summary text. Depends on no other stage.
- **product.competitors** – Uses OpenAI to identify direct/adjacent competitors, leveraging snapshot data (`lib/server/productInsights/pipeline/stages/productCompetitorsStage.ts:9`). Result includes competitor list, notes, and model metadata.
- **reddit.communities** – Generates discovery queries, ranks subreddits, and caches results (`lib/server/productInsights/pipeline/stages/redditCommunitiesStage.ts:8`). Uses OpenAI plus Reddit API.
- **reddit.discussions** – Harvests Reddit threads, lifts insights, and supports `standard`/`deep` modes (`lib/server/productInsights/pipeline/stages/redditDiscussionsStage.ts:8`). Requires snapshot, competitors, and communities.
- **producthunt.launches** – Fetches launch performance, derived vote velocity, and clusters of similar launches via Product Hunt's Algolia index (`lib/server/productInsights/pipeline/stages/productHuntStage.ts:8`). Aggregates trending keywords, high-reach topics, and actionable peer insights to inform positioning gaps.
- **hackernews.discussions** – Queries HN Algolia API, builds summaries, and reuses competitor + snapshot context (`lib/server/productInsights/pipeline/stages/hackerNewsDiscussionsStage.ts:8`).
- **report.comprehensive** – Synthesizes the final executive report using prior stage outputs (`lib/server/productInsights/pipeline/stages/reportComprehensiveStage.ts:8`).

To understand a stage’s data contract, look at the matching union branches in `ProductInsightStageDataById` (`types/product-insights.ts:266`). When consuming or extending data, rely on these types.

## Access control & usage policies

- Access checks combine plan assignments and user purchases. `evaluateInsightsPipelineAccess` enforces the `insights.pipeline` feature and usage cooldowns (`lib/server/productInsights/access.ts:48`).
- Usage policies are parsed and formatted via `lib/productInsights/insightsUsage.ts:1`; policies drive messaging in the UI (`components/pages/ProductInsightsView.tsx:74`).
- Throttling feedback is surfaced through the `SchedulePipelineResult` contract in member actions (`actions/member/products/insights.ts:83`).

## UI integration

- The primary UI is `ProductInsightsView` (`components/pages/ProductInsightsView.tsx:1`), a client component that renders each stage via renderer hints and surfaces run controls for members and admins.
- Member actions call `scheduleProductInsightsPipeline` (`actions/member/products/insights.ts:94`); admin overrides use `scheduleAdminProductInsightsPipeline` (`actions/admin/products/insights.ts:79`). Both set `pipelineJobState` so the UI can display "Queued"/"Active" badges.
- Stage outputs are read from the serialized profile and rendered per renderer type (snapshot table, competitor cards, Reddit/HN accordions, report highlights). New renderers must be added to this component or to downstream atom/molecule components.

## Environment requirements

- **OpenAI:** `OPENAI_API_KEY` for all model-backed stages (`lib/server/openai.ts:1`). Optional overrides for model choices via `PRODUCT_INSIGHT_*` env vars (`lib/server/productInsights/config.ts:1`).
- **Redis:** `REDIS_URL`/`REDIS_TLS_URL` for queueing and caching (`lib/server/redis.ts:1`). Set `REDIS_ENV_NAMESPACE` to isolate environments.
- **Reddit:** `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, optional `REDDIT_USER_AGENT` for subreddit/discussion harvest (`lib/server/productInsights/redditClient.ts:1`).
- **Cron secret:** `CRON_SECRET` must match headers for cron endpoints (`app/api/cron/product-insight-pipeline/route.ts:32`).
- Ensure outbound HTTPS is allowed for Reddit, HN Algolia, and target product sites when running locally.

## Working with profiles in code

- Always load profiles with `insightProfileSelect` + `serializeInsightProfile` to enforce consistent shape (`lib/server/productInsights/profile.ts:270`).
- Stage views provide both `status` and `metrics`; check `view.metrics` before presenting derived analytics to avoid null references.
- `ProductInsightStageViewMap` keys are optional; guard for missing stages, especially when using partial stage sets (`types/product-insights.ts:296`).
- Use `ProductInsightProfilePayload.redditMode` to detect whether the last Reddit run was deep (`types/product-insights.ts:329`).

## Running the pipeline locally

- Seed Redis and ensure env vars are present.
- Trigger via UI (Product detail → Insights → “Refresh insights”) or invoke the action directly in a REPL: `await scheduleProductInsightsPipeline(slug)`. For admin tests, call `scheduleAdminProductInsightsPipeline`.
- To emulate cron, hit `/api/cron/product-insight-pipeline?limit=1` with the correct `Authorization` header.
- Inspect logs for `[productInsights:pipeline]` to trace stage execution; failures bubble up via `ProductInsightStatus.failed` and stage `errorMessage` fields.

## Extending with a new data source or stage

1. **Model types:** Add a new `ProductInsightStageId` variant and corresponding data shape to `types/product-insights.ts:227`.
2. **Runtime stage:** Implement `PipelineStage` logic under `lib/server/productInsights/pipeline/stages/`. Populate `execute` and `serialize`, set sensible retry policy, and share outputs via `shared` if downstream stages need them.
3. **Register stage:** Add the stage to `PIPELINE_STAGES_IN_ORDER` (`lib/server/productInsights/pipeline/stages/index.ts:12`). Update `STAGE_RENDER_METADATA` so the UI knows how to present it (`lib/server/productInsights/stages.ts:12`).
4. **Stage sets:** Decide which stage sets should include the new stage and extend `PRODUCT_INSIGHT_STAGE_SETS` accordingly (`lib/server/productInsights/stages.ts:83`).
5. **Serialization:** Update `serializeInsightProfile` to parse and expose the new stage payload (`lib/server/productInsights/profile.ts:270`).
6. **Database:** No schema changes are needed unless you require additional indexes; data lands in `ProductInsightStageResult.data` as JSON.
7. **UI renderer:** Implement a renderer path in `ProductInsightsView` (or a new component) keyed by the new `renderer` hint. Extend `ProductInsightStageRendererHint` if necessary (`types/product-insights.ts:235`).
8. **Stage dependencies:** Update dependent stages to read from `context.shared` as needed. Share stage data by returning it in the `shared` block of `serialize` (`lib/server/productInsights/pipeline/types.ts:26`).
9. **Tests:** Add unit coverage under `lib/server/productInsights/__tests__` mirroring existing stage tests (e.g., `hackerNews.test.ts`).

## Using existing stage data elsewhere

- For reporting, extract stage-specific data from `profile.stages[stageId].data`, casting with the union types.
- Metrics (e.g., `queryCoverage`, `threadCount`) are already computed in `serialize`; avoid recomputing in the UI (`lib/server/productInsights/pipeline/stages/redditCommunitiesStage.ts:37`).
- When exporting or syncing to other systems, prefer the flattened convenience fields on `ProductInsightProfilePayload` (e.g., `profile.redditInsights`) to minimize JSON parsing.

## Observability & failure handling

- Stage retries are governed by each stage’s `retryPolicy`; after the final attempt the pipeline stops and marks the profile failed (`lib/server/productInsights/pipelineRunner.ts:578`).
- Profile status sticks at `failed` until a successful rerun updates it; surface this in the UI via `STATUS_STYLES` (`components/pages/ProductInsightsView.tsx:77`).
- Queue state can be inspected with `peekPipelineQueueLength` (`lib/server/productInsights/pipelineQueue.ts:180`) and `getPipelineJobState` (`lib/server/productInsights/pipelineQueue.ts:200`).
- Email notifications are sent automatically on successful runs (`lib/server/productInsights/pipelineRunner.ts:631`). Disable per-run by passing `notifyOnCompletion: false` to `runProductInsightPipeline` when calling it programmatically.

## Testing & local development

- Vitest coverage exists for core pieces under `lib/server/productInsights/__tests__`; run `npm run test -- productInsights` to iterate quickly.
- Mock external services (Reddit, OpenAI, HN) through the helpers in tests or via `vitest.setup.tsx` mocks.
- Ensure you regenerate the Prisma client if you change schema (`npm run prisma:generate`).

## Checklist before shipping changes

- Confirm stage definitions and renderer hints stay in sync (`lib/server/productInsights/stages.ts:12`).
- Verify new env vars are documented and provided in deployment environments.
- Run `npm run lint`, `npm run test`, and, if applicable, exercise `/api/cron/product-insight-pipeline` in a staging environment.
- Communicate schema or cache migrations to operations; Redis key namespaces are versioned, so bumping keys avoids cross-environment collisions.
