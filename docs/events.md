# Event Dispatch Pipeline

Shipyard routes non-critical product events through a durable outbox so UI calls stay snappy while background work such as analytics refreshes runs off-thread.

## Anatomy

- **Dispatcher** – `dispatchEvent(event, payload)` (see `lib/server/events.ts`) persists an `EventEnvelope` row for every handler group and marks it ready for the worker.
- **Outbox** – Backed by the Prisma models `EventEnvelope` and `EventAttempt` (see migration `20251020120000_add_event_envelopes`). Each envelope stores the event payload, pending handler ids, status, attempt count, queue assignment, and timestamps for observability.
- **Priority queues** – Queue metadata lives in `lib/server/events/queues.ts`. Shipyard ships three tiers (`high` → 5 min, `default` → 15 min, `low` → 30 min) and envelopes land in the fastest tier referenced by their handlers. Add new queues by extending this config.
- **BullMQ worker** – `npm run worker` starts `bin/shipyard-worker.ts`, subscribes to the `shipyardhq-events` queue, hydrates envelopes by id, and executes pending handlers sequentially with retry/backoff semantics (`lib/server/events/worker.ts`). Postgres remains the source of truth: event jobs are added when envelopes are created, and the worker periodically reconciles due/stale envelopes back into BullMQ if enqueueing was missed. The same process owns maintenance schedules from `lib/server/jobs/scheduled.ts` and runs their handlers in `lib/server/jobs/scheduledRunner.ts`.
- **Timed plan boundaries** – Active product-plan grants persist deterministic `product.plan-grant-boundary` envelopes in the same transaction that projects the grant. Only after that transaction commits does the application start best-effort delayed BullMQ delivery; the grant write never waits for Redis, and the Postgres outbox reconciler recovers missed jobs. At execution the handler re-reads every grant for the product, expires due windows, projects the current winner, and refreshes public caches.
- **Handler registry** – Modules register with `registerEventHandler({ event, id, handler, queue })`. Use stable `id` strings so retries can resume partially processed envelopes and assign handlers to the queue that best matches their latency requirements (defaults to the `default` queue).

## Adding / Updating Handlers

1. Import `registerEventHandler` from `@/lib/server/events`.
2. Choose an idempotent `id` (e.g. `products.product-upvote`).
3. Ensure the handler is idempotent. For non-repeatable side effects, store delivery receipts keyed by `envelopeId + handlerId` or guard with existing uniqueness constraints.
4. Update publishers to call `dispatchEvent`. All handlers now execute through the async queue.

## Worker Behaviour

- Sequential handler execution with `Promise.allSettled`-style resilience.
- Timeouts: each job inherits a 15 minute deadline; individual handler calls race against the remaining time and record a `timed_out` attempt if they exceed it.
- Retries: failed/timed-out attempts move the envelope to `status = retrying`, increment the attempt counter, and let BullMQ retry the job with backoff. When attempts exceed five, the envelope is marked `dead_letter`.
- Claims: workers atomically move due envelopes from `pending`/`retrying` to `processing`; stale `processing` envelopes are eligible for recovery after the worker timeout window.
- Observability: every handler attempt appends a row to `EventAttempt` with status, duration, and error text, enabling dashboards and dead-letter inspection.

## Local Development

- For local verification, call `dispatchEvent` then invoke `processEnvelope(envelopeId)` with an id selected from `"EventEnvelope"` to simulate one job, or run `npm run worker` with Redis/Valkey and database env configured.
- Outside production, if queueing fails (for example, missing local credentials), the dispatcher will fall back to invoking each async handler inline and mark the envelope as completed. You’ll still see the envelope row for observability.
- When adjusting handlers, run the worker against one of the inserted envelopes (or call the registered handler directly) to assert behaviour, since everything is async by default.

## Deployment Checklist

- Ensure `REDIS_URL`/`REDIS_TLS_URL` or `REDIS_SENTINEL_NAME` plus `REDIS_SENTINEL_NODES` is configured so BullMQ can push/pop envelopes. Redis/Valkey must use durable persistence and `maxmemory-policy=noeviction`.
- Run `npm run prisma:migrate` to apply the new outbox tables, followed by `npm run prisma:generate`.
- Run a dedicated worker process with `npm run worker`. It consumes event jobs and upserts BullMQ schedulers for maintenance jobs declared in `lib/server/jobs/scheduled.ts`.
- Set `SHIPYARD_EVENT_RECONCILE_INTERVAL_MS` only if the default 60 second outbox reconciliation cadence needs tuning.
- Monitor pending and dead-letter `product.plan-grant-boundary` envelopes and alert when their `nextRunAt` lag exceeds the normal worker delay.
- Use the admin operations event queue screens to inspect, requeue, or delete envelopes; legacy HTTP drain endpoints have been removed.
