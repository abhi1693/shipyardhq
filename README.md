# ShipYardHQ

Launch faster. Get discovered sooner. ShipYardHQ is a curated hub for micro‑SaaS, indie tools, and early‑stage products. Makers submit in minutes; the community discovers, upvotes, and shares what’s worth using.

## What You Can Do

- Discover: Browse by category or use case, see latest launches, and explore what’s trending on the leaderboard.
- Upvote: Support your favorite products and help them rise.
- Launch: Submit your product quickly and publish when ready.
- Feature: Boost visibility with featured placements available on paid plans.

## How It Works

1. Submit your product: Share the basics (name, description, link, category) from `/member/products`.
2. Publish and verify: Go live immediately; optional domain verification adds trust.
3. Get discovered: Appear across feeds like Featured Highlights, Latest Launches, and Editors’ Picks.
4. Grow: Collect upvotes, climb the leaderboard, and upgrade to featured for extra reach.

## Key Pages

- Browse: `/browse` — filter by categories, use cases, and verified products.
- Leaderboard: `/leaderboard` — see the most upvoted products.
- Categories: `/categories` — explore top verticals.
- Pricing: `/pricing` — free listing plus optional featured plans.
- Submit Product: `/member/products` — start your launch.

## For Makers

- Free to list. Upgrade anytime for featured placement and priority visibility.
- Clear guidance during submission; publish as draft or live.
- Shareable product pages with badges and highlights.

## For Discoverers

- Curated feeds to find quality tools faster.
- Simple upvoting to signal what’s useful.

## Testing

- Lint: `npm run lint`
- Unit: `npm run test`
- End-to-end: ensure `npm run dev` is running (seed the database first if needed), then execute `npm run test:e2e`; use `npm run test:e2e:open` for the headed runner.

## Email Delivery

- Transactional mail runs through `lib/email/resend.ts`, which now serializes messages through a shared rate-limited queue so Resend caps are respected across the app.
- Defaults align with Resend's 2 requests/sec ceiling; adjust only if your account is provisioned for a higher burst.
- Tune throughput with optional env vars: `RESEND_RATE_LIMIT_MAX_REQUESTS` or `RESEND_RATE_LIMIT_RPS` (per interval) and `RESEND_RATE_LIMIT_INTERVAL_MS` (window duration in ms).

## Analytics Instrumentation

- Product detail pages now emit client-side beacons to `/api/analytics/ingest`, capturing geo, device, and browser context without blocking rendering.
- Events are stored in the `ProductTrafficEvent` table; use Prisma to aggregate per-device or per-country insights for customers.
- Set `ANALYTICS_HASH_SALT` in `.env.local` to control the HMAC salt used when hashing IP addresses before persistence.
- Members can review per-product charts at `/member/products/[slug]/analytics` (owner access only) to explore views, devices, geo, referrers, and browser breakdowns.
- Access to the analytics dashboard is gated by the `analytics.basic` plan feature; products without it redirect back to the main member view.

## Contact

Questions or feedback? Email `support@shipyardhq.dev` or say hi on X: https://x.com/shipyardhq

## Feature Gating

- Organizations: Access to member Organizations is gated by the plan feature key `organization`. Entitlement is determined server-side: a user is entitled if they (a) own any product whose attached plan has the `organization` feature enabled, or (b) have purchased any plan that includes the `organization` feature. See `lib/memberFeatures.ts`.
- Enforcement: All organization server actions check entitlement. The member sidebar hides the Organizations link when not entitled. The organizations index is accessible and shows an upsell when access is missing.

## Reddit Outreach Bot

Use `npm exec tsx scripts/reddit-bot.ts` (or `npm run reddit:bot`) to run a CLI assistant that watches Reddit for recent product showcase posts and drafts tailored outreach replies with GPT.

### Configuration

- `config/reddit-bot.config.json` is the canonical configuration. Each subreddit entry records a `status` (`allow`, `review`, `deny`), intent notes, and the last review date. The outreach bot only monitors entries marked `allow`; communities marked `review` or `deny` are listed for manual follow-up and excluded from automation.
- The optional `discovery` section sets Shipyard's ideal customer profile (`targetProfile`) plus heuristics for filtering search results before the AI scorer runs. Tune `includeKeywords`, `excludeKeywords`, or `minIntentScore` to bias discovery toward relevant founder communities and ignore false positives like SpaceX or gaming subs.
- Override the config path with `REDDIT_CONFIG_FILE` if you keep multiple profiles. Environment variables such as `REDDIT_SUBREDDITS`, `REDDIT_KEYWORDS`, or `REDDIT_ALLOWED_FLAIRS` still take precedence when present.
- Required secrets (set in `.env.local`):
  - `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`: credentials for your Reddit script app.
  - `REDDIT_USERNAME`, `REDDIT_PASSWORD`: the Reddit account the bot posts as.
  - `OPENAI_API_KEY`: API key with access to `gpt-4.1-mini` (`OPENAI_MODEL` overrides the default).
- Additional knobs: `REDDIT_MAX_POST_AGE_MINUTES`, `REDDIT_MIN_UPVOTES`, `REDDIT_MAX_POSTS_PER_SUB`, `REDDIT_POLL_INTERVAL_SECONDS`, `REDDIT_REQUEST_DELAY_MS`, `OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_TEMPERATURE`, `REDDIT_STATE_FILE` (cache location, default `tmp/reddit-bot-state.json`), and `REDDIT_DISCOVERY_CONCURRENCY` for parallel discovery batch size.
- When a subreddit entry includes custom `intent`, `notes`, or `ruleSummary`, the outreach bot automatically weaves that guidance into the drafting prompt so replies respect community norms uncovered during discovery.

The script prints each candidate post, the GPT-generated draft, and pauses for a `y/n` approval before posting (use `r` to regenerate). Decisions (approve/skip) are cached in `tmp/reddit-bot-state.json` so the bot will not repeatedly prompt on the same thread.

### Discovery assistant

Use `npm run reddit:discover -- --query "saas,product feedback" --min-subscribers 750 --write` to let AI surface relevant communities, inspect moderation rules, and merge the vetted results back into `config/reddit-bot.config.json`. Key flags:

- `--query/-q`: comma-separated search terms (defaults to the keywords in the config file).
- `--limit`: maximum subreddits to review per query (default `15`).
- `--min-subscribers`: minimum subscriber count (default `500`).
- `--include-nsfw`: include NSFW communities in the search.
- `--skip-existing`: ignore subreddits already listed in the config.
- `--min-intent-score`: override the minimum number of intent keyword matches required before an AI review (defaults to the config value).
- `--concurrency`: number of subreddit evaluations to run in parallel (default `3`, respects `REDDIT_DISCOVERY_CONCURRENCY`).
- `--write`: persist suggested entries into the config (otherwise results are printed and written to `tmp/reddit-discovery-results.json` for review).

Each discovery run filters out communities that clash with your intent heuristics, then prints an AI summary for every remaining candidate (verdict, risk factors, recommended messaging angle) and writes the raw JSON output to `tmp/reddit-discovery-results.json` for auditing before automation.

Discovery assumes the bot only posts reply **comments** on existing threads (never new standalone posts); the AI scorer explicitly checks for comment-level promotion rules and will mark a subreddit as `avoid` if replies are disallowed even when posts are permitted.

Hit `Ctrl+C` at any point and the assistant will persist the progress gathered so far before exiting; the next run automatically resumes from that snapshot, skipping communities you've already evaluated.
