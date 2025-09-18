# ShipYardHQ

Launch faster. Get discovered sooner. ShipYardHQ is a curated hub for micro‑SaaS, indie tools, and early‑stage products. Makers submit in minutes; the community discovers, upvotes, and shares what’s worth using.

## What You Can Do

- Discover: Browse by category or use case, see latest launches, and explore what’s trending on the leaderboard.
- Upvote: Support your favorite products and help them rise.
- Launch: Submit your product quickly and publish when ready.
- Feature: Boost visibility with featured placements available on paid plans.

## How It Works

1. Submit your product: Share the basics (name, description, link, category) at `/member/products/add`.
2. Publish and verify: Go live immediately; optional domain verification adds trust.
3. Get discovered: Appear across feeds like Featured Highlights, Latest Launches, and Editors’ Picks.
4. Grow: Collect upvotes, climb the leaderboard, and upgrade to featured for extra reach.

## Key Pages

- Browse: `/browse` — filter by categories, use cases, and verified products.
- Leaderboard: `/leaderboard` — see the most upvoted products.
- Categories: `/categories` — explore top verticals.
- Pricing: `/pricing` — free listing plus optional featured plans.
- Submit Product: `/member/products/add` — start your launch.

## For Makers

- Free to list. Upgrade anytime for featured placement and priority visibility.
- Clear guidance during submission; publish as draft or live.
- Shareable product pages with badges and highlights.

## For Discoverers

- Curated feeds to find quality tools faster.
- Simple upvoting to signal what’s useful.

## Analytics Instrumentation

- Product detail pages now emit client-side beacons to `/api/analytics/ingest`, capturing geo, device, and browser context without blocking rendering.
- Events are stored in the `ProductTrafficEvent` table; use Prisma to aggregate per-device or per-country insights for customers.
- Set `ANALYTICS_HASH_SALT` in `.env.local` to control the HMAC salt used when hashing IP addresses before persistence.
- Members can review per-product charts at `/member/products/[slug]/analytics` (owner access only) to explore views, devices, geo, referrers, and browser breakdowns.
- Access to the analytics dashboard is gated by the `analytics.basic` plan feature; products without it redirect back to the main member view.

## Contact

Questions or feedback? Email `shipyardhq.dev@gmail.com` or say hi on X: https://x.com/abhi16_93

## Feature Gating

- Organizations: Access to member Organizations is gated by the plan feature key `organization`. Entitlement is determined server-side: a user is entitled if they (a) own any product whose attached plan has the `organization` feature enabled, or (b) have purchased any plan that includes the `organization` feature. See `lib/memberFeatures.ts`.
- Enforcement: All organization server actions check entitlement. The member sidebar hides the Organizations link when not entitled. The organizations index is accessible and shows an upsell when access is missing.

## Reddit Outreach Bot

Use `npm exec tsx scripts/reddit-bot.ts` to run a CLI assistant that watches Reddit for recent product showcase posts and drafts tailored outreach replies with GPT.

### Required env vars

Set these before running (e.g., in `.env.local`):

- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`: credentials for your Reddit script app.
- `REDDIT_USERNAME`, `REDDIT_PASSWORD`: the Reddit account the bot posts as.
- `OPENAI_API_KEY`: API key with access to `gpt-4.1-mini` (override via `OPENAI_MODEL`).

Optional tuning:

- `REDDIT_SUBREDDITS` (comma list, default `startups,Entrepreneur,smallbusiness,Entrepreneurship,business,IndieHackers,SaaS,SaaS_Talk,EntrepreneurRideAlong,bootstrapping,WebApps,alphaandbetausers,ProductFeedback,DesignCritiques,AppHookup,InternetIsBeautiful,SideProject,SideHustle,BuildInPublic,selfhosted,opensource,indiebiz,webdev,frontend,coding,learnprogramming`).
- `REDDIT_KEYWORDS` (comma list, default `launch,product,showcase,feedback,built,app`).
- `REDDIT_ALLOWED_FLAIRS` (comma list, default `showoff,showcase,launch,feedback,demo,beta,product,milestone`).
- `REDDIT_MAX_POST_AGE_MINUTES`, `REDDIT_MIN_UPVOTES`, `REDDIT_MAX_POSTS_PER_SUB`.
- `REDDIT_POLL_INTERVAL_SECONDS` (default 300s) and `REDDIT_REQUEST_DELAY_MS` to respect rate limits.
- `OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_TEMPERATURE` for draft length/tone tweaks.
- `REDDIT_STATE_FILE` to change the cache location (default `tmp/reddit-bot-state.json`).

The script prints each candidate post, the GPT-generated draft, and pauses for a `y/n` approval before posting (use `r` to request a fresh draft). Decisions (approve/skip) are cached in `tmp/reddit-bot-state.json` so the bot will not repeatedly prompt on the same thread.
