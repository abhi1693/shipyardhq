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

## Contact

Questions or feedback? Email `shipyardhq.dev@gmail.com` or say hi on X: https://x.com/abhi16_93

## Feature Gating

- Organizations: Access to member Organizations is gated by the plan feature key `organization`. Entitlement is determined server-side: a user is entitled if they own any product whose attached plan has the `organization` feature enabled. See `lib/memberFeatures.ts`.
- Enforcement: All organization server actions check entitlement. The member sidebar hides the Organizations link when not entitled. The organizations index redirects to `/member/products?upgrade=organization` if access is missing.
