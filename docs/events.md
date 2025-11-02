# Event Dispatch Pipeline

Shipyard now routes non-critical product events through a durable outbox so UI calls stay snappy while background work (emails, social posts, analytics refreshes) runs off-thread.

## Anatomy

- **Dispatcher** – `dispatchEvent(event, payload)` (see `lib/server/events.ts`) persists an `EventEnvelope` row for every handler group and marks it ready for the worker.
- **Outbox** – Backed by the Prisma models `EventEnvelope` and `EventAttempt` (see migration `20251020120000_add_event_envelopes`). Each envelope stores the event payload, pending handler ids, status, attempt count, queue assignment, and timestamps for observability.
- **Priority queues** – Queue metadata lives in `lib/server/events/queues.ts`. Shipyard ships three tiers (`high` → 5 min, `default` → 15 min, `low` → 30 min) and envelopes land in the fastest tier referenced by their handlers. Add new queues by extending this config.
- **Queue worker** – `app/api/events/drain/route.ts` and `app/api/cron/events/drain/[queue]/route.ts` claim pending envelopes for a specific queue, hydrate the payload back into typed objects, and execute the pending handlers sequentially with retry/backoff semantics (`lib/server/events/worker.ts`). Each run drains up to 500 envelopes or roughly 14.5 minutes of work—whichever comes first—while working in batches of 25.
- **Handler registry** – Modules register with `registerEventHandler({ event, id, handler, queue })`. Use stable `id` strings so retries can resume partially processed envelopes and assign handlers to the queue that best matches their latency requirements (defaults to the `default` queue).

## Adding / Updating Handlers

1. Import `registerEventHandler` from `@/lib/server/events`.
2. Choose an idempotent `id` (e.g. `email.product-vote-milestone`).
3. Ensure the handler is idempotent. For non-repeatable side effects (emails, tweets) store delivery receipts keyed by `envelopeId + handlerId` or guard with existing uniqueness constraints.
4. Update publishers to call `dispatchEvent`. All handlers now execute through the async queue.

## Worker Behaviour

- Sequential handler execution with `Promise.allSettled`-style resilience.
- Timeouts: each job inherits a 15 minute deadline; individual handler calls race against the remaining time and record a `timed_out` attempt if they exceed it.
- Retries: failed/timed-out attempts move the envelope to `status = retrying`, increment the attempt counter, and rely on the next drain run to pick them up. When attempts exceed five, the envelope is marked `dead_letter`.
- Observability: every handler attempt appends a row to `EventAttempt` with status, duration, and error text, enabling dashboards and dead-letter inspection.

## Local Development

- For local verification, call `dispatchEvent` then invoke `processEnvelope(envelopeId)` with an id selected from `"EventEnvelope"` to simulate the worker end-to-end.
- Outside production, if queueing fails (for example, missing local credentials), the dispatcher will fall back to invoking each async handler inline and mark the envelope as completed. You’ll still see the envelope row for observability.
- When adjusting handlers, run the worker against one of the inserted envelopes (or call the registered handler directly) to assert behaviour, since everything is async by default.

## Deployment Checklist

- Ensure `REDIS_URL` (or `REDIS_TLS_URL`) is configured so the queue can push/pop envelopes.
- Run `npm run prisma:migrate` to apply the new outbox tables, followed by `npm run prisma:generate`.
- Schedule cron jobs (or background workers) per queue tier:
  - `GET /api/cron/events/drain/high` every 5 minutes for cache revalidation and other fast-lane tasks.
  - `GET /api/cron/events/drain/default` every 15 minutes for standard business logic.
  - `GET /api/cron/events/drain/low` every 30 minutes for deferred notifications and side effects.
    The generic `/api/events/drain?queue=<id>` endpoint remains available for ad-hoc invocations.
