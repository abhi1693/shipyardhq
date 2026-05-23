# Notifications

Shipyard uses Novu to deliver in-app and email notifications. Most notification payloads are triggered from server-side helpers in `lib/server/notifications`.

## Development Utilities

- Clear Novu subscribers (dry-run by default):
  - `npm run novu:clear-subscribers`
  - Delete with `npm run novu:clear-subscribers -- --confirm`

## Founder Visibility (Soft Hooks)

Founders respond to visibility signals more reliably than requests for updates. The weekly founder visibility job sends informational nudges like:

- “Your product is trending this week”
- “Your product moved up 6 places”
- “You are now top 3 in category X”

### Scheduled Job

- `founder-visibility-owner` runs in the self-hosted BullMQ worker on Mondays at 00:00 UTC.
- The production schedule uses the owner audience. Tune limits and thresholds in `runFounderVisibilityEngagement` when the campaign strategy changes.

### Implementation Notes

- Scoring and ranking use `computeLeaderboardWindow` (`lib/server/leaderboard/v2.ts`) for the current ISO week and the previous ISO week.
- Owner notifications route through the Novu “product notifications” workflow; broadcasts (`audience=all`) route through the “recommendations” workflow topic.

## Micro Leaderboards (Weekly Category Nudges)

Micro leaderboards send category-based weekly nudges to product owners:

- Mid-week competitive nudge: “You are close to the top”

### Scheduled Job

- `micro-leaderboards-midweek` runs in the self-hosted BullMQ worker on Wednesdays at 12:00 UTC.
- Tune rank windows and notification caps in `runMicroLeaderboardEngagement` when the nudge strategy changes.

### Implementation Notes

- Weekly ranking is computed from `computeLeaderboardWindow` (ISO week) and then re-ranked per category.
- Links point to the weekly leaderboard view with a category filter: `/leaderboard/weekly/{year}/{week}?category={slug}`.
