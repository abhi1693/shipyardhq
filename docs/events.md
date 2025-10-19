# Event Dispatch Pipeline

Shipyard now routes non-critical product events through a durable outbox so UI calls stay snappy while background work (emails, social posts, analytics refreshes) runs off-thread.

## Anatomy

- **Dispatcher** – `dispatchEvent(event, payload)` (see `lib/server/events.ts`) now persists an `EventEnvelope` row for every handler and enqueues the envelope id onto the Redis queue `events:queue` (namespaced via `CACHE_ENV_PREFIX`); handlers are executed off-thread by the worker.
- **Outbox** – Backed by the Prisma models `EventEnvelope` and `EventAttempt` (see migration `20251020120000_add_event_envelopes`). Each envelope stores the event payload, pending handler ids, status, attempt count, and timestamps for observability.
- **Queue worker** – `app/api/events/drain/route.ts` pops batches from Redis, locks the envelope, hydrates the payload back into typed objects, and executes the pending handlers sequentially with retry/backoff semantics (`lib/server/events/worker.ts`). Each run drains up to 500 envelopes or roughly 14.5 minutes of work (15 minute Vercel window with a 30 second buffer)—whichever comes first—while working in batches of 25. Trigger this endpoint via cron or a background job to keep the queue drained.
- **Handler registry** – Modules register with `registerEventHandler({ event, id, handler })`. Use stable `id` strings so retries can resume partially processed envelopes. All handlers run asynchronously through the queue today.

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

- The dispatcher’s queue push is mocked in Vitest (`lib/server/__tests__/events.test.ts`). For manual testing, call `dispatchEvent` then invoke `processEnvelope(envelopeId)` with an id selected from `"EventEnvelope"` to simulate the worker locally.
- Outside production, if queueing fails (for example, missing local credentials), the dispatcher will fall back to invoking each async handler inline and mark the envelope as completed. You’ll still see the envelope row for observability.
- When adjusting handlers, run the worker against one of the inserted envelopes (or call the registered handler directly) to assert behaviour, since everything is async by default.

## Deployment Checklist

- Ensure `REDIS_URL` (or `REDIS_TLS_URL`) is configured so the queue can push/pop envelopes.
- Run `npm run prisma:migrate` to apply the new outbox tables, followed by `npm run prisma:generate`.
- Schedule a cron (or background job) that calls `POST /api/events/drain` frequently enough to keep up with throughput (each invocation processes up to 500 envelopes or ~14.5 minutes of handler time, whichever arrives first, leaving a 30 second safety window before Vercel’s 15 minute cap).
