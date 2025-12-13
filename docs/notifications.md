# Notifications

Shipyard uses Novu to deliver in-app and email notifications. Most notification payloads are triggered from server-side helpers in `lib/server/notifications`.

## Founder Visibility (Soft Hooks)

Founders respond to visibility signals more reliably than requests for updates. The weekly founder visibility job sends informational nudges like:

- “Your product is trending this week”
- “Your product moved up 6 places”
- “You are now top 3 in category X”

### Cron Endpoint

- `GET /api/cron/founder-visibility`
  - Query params:
    - `audience=owner|all` (default `owner`)
    - `topN=<int>` (default `10`) – “trending” threshold (entered top N overall week-over-week)
    - `minMove=<int>` (default `6`) – minimum rank improvement to notify
    - `max=<int>` (default `200`) – cap notifications per run
    - `dryRun=1` – compute candidates without sending

Scheduled in `vercel.json` as a weekly job:

- `/api/cron/founder-visibility?audience=owner` (Mondays at 00:00 UTC)

### Implementation Notes

- Scoring and ranking use `computeLeaderboardWindow` (`lib/server/leaderboard/v2.ts`) for the current ISO week and the previous ISO week.
- Owner notifications route through the Novu “product notifications” workflow; broadcasts (`audience=all`) route through the “recommendations” workflow topic.
