# Shipyard Rewards System Guide

## System overview

- Rewards are Shipyard's internal currency. Members earn points via engagement events and spend them on placements, analytics, and perks managed by the rewards engine (`lib/rewards/engine.ts`).
- The system is orchestrated through Prisma models for balances, rules, catalog items, transactions, redemptions, entitlements, and placement schedules (`prisma/schema.prisma:644`).
- Core domain logic lives in the rewards engine service, which exposes idempotent helpers for awarding, redeeming, refunding, and adjusting balances (`lib/rewards/engine.ts:116`).
- Automation hooks (event listeners, cron jobs, and scheduled placement processing) call into the engine to keep balances synchronized with product activity (`lib/server/rewards`).
- Admin and member surfaces consume typed selectors that aggregate balance snapshots, catalog availability, and transaction history for both auditing and self-service redemption flows (`actions/member/rewards/actions.ts:90`).

## Core Prisma models

- `RewardBalance` – per-user ledger with current balance, lifetime stats, and streak metadata (`prisma/schema.prisma:644`).
- `RewardRule` – catalog of earnable rule definitions with caps, cooldowns, and metadata (`prisma/schema.prisma:668`).
- `RewardCatalogItem` – redeemable perks with pricing, duration, availability limits, and product requirements (`prisma/schema.prisma:693`).
- `RewardTransaction` – immutable record of every balance mutation (earn, spend, adjust, refund) plus linkage back to rules, catalog items, redemptions, and products (`prisma/schema.prisma:721`).
- `Redemption` – tracks the lifecycle of a redeemed perk and its activation window (`prisma/schema.prisma:735`).
- `FeatureEntitlement` – enables features for users/products once a redemption is active; placement schedules and entitlements stay in sync (`prisma/schema.prisma:765`).
- `PlacementSchedule` – (see schema) controls timed product placements that pair with certain catalog items and feed the placement scheduler cron.

## Awarding rewards

- `awardRewards` is the authoritative entry point for earning. It validates the rule, enforces concurrency by locking the balance row, and applies daily/lifetime caps and cooldowns before incrementing the balance (`lib/rewards/engine.ts:116`).
- Idempotency is achieved by hashing `eventId` with the user/rule to form `eventHash`; duplicates return the existing transaction without mutating state (`lib/rewards/engine.ts:121`).
- Caps aggregate prior transactions at the rule scope (`lib/rewards/engine.ts:756`). Cooldowns can be global or target-specific if a `targetId` is supplied (`lib/rewards/engine.ts:780`).
- Streak metadata in `RewardBalance` can be updated atomically by passing `payload.streak` to `awardRewards`, allowing external streak calculators to set counts/tiers (`lib/rewards/engine.ts:862`).
- Transactions publish `rewards.awarded` events for downstream consumers once commits succeed (`lib/rewards/engine.ts:200`).
- To grant custom amounts, provide `payload.amount`; otherwise the rule's `baseRewardAmount` is used with an optional multiplier (`lib/rewards/engine.ts:872`).

### Automated earn sources

- **Product engagement:** Listeners on the internal event bus award points for upvotes, new product launches, and reviews while ignoring self-awards and handling soft failures (`lib/server/rewards/listeners.ts:13`). Product detail views dispatch `product.viewed` events that hydrate rewards asynchronously (`lib/server/rewards/engagement.ts:70`) via `queueProductViewReward` from the product page (`app/(public)/products/[slug]/page.tsx:184`), CTA clicks award points after the redirect workflow completes (`actions/public/products/analytics.ts:124`), and a depth bonus fires when review bodies exceed 200 chars (`lib/server/rewards/listeners.ts:77`).
- **Daily login:** `ensureDailyLoginReward` now checks both pending envelopes and prior reward transactions before queueing work, then caches the day locally to avoid repeat grants (`lib/server/rewards/loginReward.ts:30`). Integrate this helper in auth flows to keep streaks alive without flooding the queue.
- **Feedback closure:** Admins granting feedback rewards trigger `awardRewards` with feedback metadata when statuses transition to `closed` (`actions/admin/feedback/actions.ts:115`).
- **Backlink verification:** The cron worker crawls member sites, validates backlinks, and awards the `rewards.backlink.verify` rule once per product using a deterministic `eventId` (`lib/server/rewards/backlinkVerification.ts:336`).

## Redeeming rewards & entitlements

- `redeem` performs transactional debits, checks balance sufficiency, and enforces per-user active/pending limits before creating redemption, entitlement, and optional placement schedule records (`lib/rewards/engine.ts:233`).
- Placement-like catalog items require scheduling; helper `requiresPlacementSchedule` inspects category/metadata to determine whether an activation window & slot key must be supplied (`lib/rewards/engine.ts:86`).
- Reservation metadata (slot key, schedule bounds) is merged into both redemption and entitlement records for auditing (`lib/rewards/engine.ts:372`).
- Successful redemptions emit `rewards.redeemed` events containing cost, balance-after, activation state, and placement IDs to fan out updates (`lib/rewards/engine.ts:455`).
- Member UI derives eligibility reasons, counts, and availability via `getMemberRewardsSnapshot`, which hydrates balance summary, recent transactions, catalog items, active entitlements, and redemptions in one request (`actions/member/rewards/actions.ts:90`).
- The client-side redemption modal submits to `redeemCatalogItemAction`, which guards access control, ensures product selection for product-scoped perks, and seeds default placement reservations when needed (`actions/member/rewards/actions.ts:292`).

## Refunds & adjustments

- `refundRedemption` returns unused rewards, optionally reverting entitlements/placements when the perk should be canceled (`lib/rewards/engine.ts:473`). The call is idempotent via `eventHash` and publishes `rewards.refunded` with refund metadata.
- Partial refunds accumulate in `redemption.refundedRewards`; once the refunded total reaches the original cost the redemption transitions to `refunded` status automatically (`lib/rewards/engine.ts:508`).
- Admins issue refunds through `refundRedemptionAction`, which validates reason/reference input before invoking the engine (`actions/admin/rewards/actions.ts:544`).
- Manual adjustments (positive or negative) rely on `adjustRewards`, which inserts synthetic transactions with actor metadata and safeguards against overdrafting (`lib/rewards/engine.ts:604`). Admin UI wraps the helper in `adjustUserRewardsAction`, capturing reason/reference data for audit trails (`actions/admin/rewards/actions.ts:458`).

## Admin tooling

- Rule and catalog CRUD lives in `actions/admin/rewards/actions.ts:120`, with shared parsing helpers for JSON metadata and numeric fields (`actions/admin/rewards/utils.ts:1`).
- Server components under `app/(admin)/admin/rewards/*` render listings and forms that call the server actions; e.g., rules table columns surface enable/disable controls tied to `toggleRewardRuleAction` (`app/(admin)/admin/rewards/rules/columns.tsx`).
- Adjustment and refund flows are implemented as client components with optimistic toasts (`components/pages/admin/rewards/AdjustRewardsForm.tsx:1`, `components/pages/admin/rewards/RefundRedemptionForm.tsx:1`).
- The admin navigation registers rewards management in the primary menu (`app/(admin)/admin/layout.tsx:38`).

## Background jobs & scheduling

- **Placement scheduler:** Cron endpoint `/api/cron/rewards/placements` authorizes with `CRON_SECRET` and activates or expires placement schedules, updating entitlements, redemptions, and product badges in a single transaction (`app/api/cron/rewards/placements/route.ts:1`, `lib/server/rewards/placementScheduler.ts:20`). Cache revalidation ensures public surfaces reflect placement changes immediately (`lib/server/rewards/placementScheduler.ts:186`).
- **Backlink verifier:** `/api/cron/rewards/backlinks` runs backlink checks with controlled concurrency, awarding the verification rule on success and logging failures for admin review (`app/api/cron/rewards/backlinks/route.ts:1`, `lib/server/rewards/backlinkVerification.ts:35`).
- Cron schedules are wired in `vercel.json` for production deployments (`vercel.json:6`).

## Public & member experiences

- The member dashboard route loads the snapshot and renders balance cards, active perks, and redemption history with a client-driven redemption dialog (`app/(member)/member/rewards/page.tsx:1`, `components/pages/MemberRewards.tsx:1`).
- A marketing-facing explainer aggregates stats, featured rules, catalog items, and hero redemptions via `getPublicRewardsData`, which applies cache strategies and aggregates transaction history for recent windows (`app/(public)/rewards/page.tsx:1`, `actions/public/rewards/actions.ts:49`).
- Public metrics include members with rewards, active balances, and 30-day earn/spend totals. Rule and catalog cards expose base values and caps for transparency (`actions/public/rewards/actions.ts:108`).

## Seeding & configuration

- `prisma/seed.rewards.ts` seeds canonical rules and catalog items, including priority placements and analytics perks. It links catalog entries to plan features when available and warns if plan keys are missing (`prisma/seed.rewards.ts:24`).
- Seeded rules encode default caps/cooldowns (e.g., daily login, upvote, review depth) and can be extended without manual DB work.
- The placement scheduler cron requires `CRON_SECRET` in the environment to reject unauthorized calls (`app/api/cron/rewards/placements/route.ts:9`).
- A one-off product launch backfill can be triggered through the secured cron endpoint to grant any missing launch rewards after deploys (`app/api/cron/rewards/launch-backfill/route.ts:1`).
- Rewards-specific events rely on the in-memory event bus; ensure listeners are registered during app bootstrap (`lib/server/rewards/listeners.ts:43`).

## Extending the system

1. **Add a new earn rule:** Seed or insert a `RewardRule`, then trigger `awardRewards` from either an event listener or a direct call with a stable `eventId` to keep grants idempotent. Populate metadata with contextual fields consumers might need (`lib/rewards/engine.ts:146`).
2. **Introduce a new perk:** Create a `RewardCatalogItem` with pricing, limits, and metadata tags. If the perk should schedule automatically, ensure `requiresPlacementSchedule` recognizes it either via category or metadata (`lib/rewards/engine.ts:86`). Update member/admin UIs as needed to surface descriptive copy.
3. **Launch automated jobs:** Build a worker that queries eligible subjects, call the appropriate engine helper inside a transaction, and wrap the endpoint in `ensureCronAuthorized`/`CRON_SECRET` patterns for safety (`app/api/cron/rewards/backlinks/route.ts:1`).
4. **Consume reward events:** Subscribe to `rewards.*` topics via the event bus for notifications, analytics, or additional automation (`lib/server/events.ts:80`).

## Operational tips

- Always call engine helpers (award, redeem, adjust, refund) within API routes or actions that can bubble up `RewardsError` so the UI can present friendly messaging (`lib/rewards/errors.ts:1`).
- When deducting rewards manually, prefetch the user balance to anticipate insufficiency errors and surface clearer guidance (`lib/rewards/engine.ts:610`).
- For scheduled perks, pair redemptions with placement slots and ensure cron cadence is frequent enough to activate upcoming placements before their start time (`lib/server/rewards/placementScheduler.ts:44`).
- Monitor the backlink verification summary to catch systemic failures; the job returns aggregate counts that can be wired into ops dashboards (`lib/server/rewards/backlinkVerification.ts:312`).
