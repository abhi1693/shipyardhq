# Product plan grant rollout

This migration must use a controlled cutover. A rolling update is unsafe because
an old web pod can write `Product.planId` after the one-time database backfill but
before the new grant-aware code is serving traffic.

1. Confirm all existing Prisma migrations are applied and take a database backup.
2. Put the site in maintenance mode, then stop every old web pod and the scheduled
   plan-expiration worker. Webhook requests must receive a retryable failure while
   the site is drained.
3. Start one new release pod and let `prisma migrate deploy`, Prisma generation,
   and the production build finish. Do not restore traffic yet.
4. From that release, run:

   ```bash
   npm run billing:reconcile-product-grants -- --apply
   ```

   The command reads authoritative Dodo subscriptions plus one-time payments in
   the longest currently active boost window through the idempotent fulfillment
   services. It retrieves each complete provider record so refunds, disputes, and
   cart mismatches are handled before access is restored. It exits non-zero if any
   pre-migration active assignment lacks matching provider evidence. Do not bypass
   that failure by promoting the legacy `Product.planId` value.

5. Verify there are no active `migration` grants, no expired grant shown as paid,
   and every expected current customer has an active `dodo_payment` or
   `dodo_subscription` grant.
6. Restart the worker before restoring web traffic. Verify it has registered
   the `product.plan-grant-boundary` handler and can reach both Redis and the
   authenticated plan-grant cache refresh endpoint. Future grant starts and
   expiries use durable delayed outbox events; daily reconciliation remains the
   backstop for missed provider success, refund, dispute, and subscription
   events.

The schema change is additive, but do not roll back to the original pre-ledger
image: its request-time billing replay can recreate the same entitlement bug. If
the release must be rolled back, keep maintenance mode enabled and deploy a
patched prior image with that replay removed. Before that patched image receives
traffic, project verified active `dodo_*` grants back onto `Product` (or restore
the pre-cutover backup). Keep the `ProductPlanGrant` table and its data; dropping
it would destroy the billing ledger. A database restore by itself does not make
the original image safe to serve.
