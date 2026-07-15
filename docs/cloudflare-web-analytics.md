# Cloudflare Web Analytics

Shipyard HQ leaves Cloudflare Web Analytics automatic RUM collection enabled,
but its public traffic cards, product rollups, and leaderboard inputs read raw
zone HTTP traffic from the Cloudflare GraphQL Analytics API. The application
does not manually install a Cloudflare browser script. Google Analytics remains
installed separately for internal event and conversion collection; it is not a
source for public traffic reporting or scoring.

## Cloudflare setup

1. In the Cloudflare dashboard, open **Web Analytics** and add the production
   site.
2. For a hostname proxied through Cloudflare, leave automatic Web Analytics
   setup enabled so Cloudflare injects the RUM beacon.
3. Create an API token with **Zone / Analytics / Read** access for the
   production zone.
4. Copy the zone ID from **Overview** in the Cloudflare dashboard.

Cloudflare's setup and API references:

- <https://developers.cloudflare.com/web-analytics/get-started/>
- <https://developers.cloudflare.com/analytics/graphql-api/>

## Environment

Configure the web and worker runtimes with:

```bash
CLOUDFLARE_ZONE_ID="..."
CLOUDFLARE_API_TOKEN="..."
```

`CLOUDFLARE_ANALYTICS_START_DATE` optionally sets the earliest date exposed by
historical leaderboard navigation. It must use `YYYY-MM-DD` format.

`CLOUDFLARE_ANALYTICS_RETENTION_DAYS` defaults to eight days for the current
Cloudflare plan. Queries are split into one-day windows and older dates remain
zero until scheduled ingestion has accumulated them in PostgreSQL.

`CLOUDFLARE_ANALYTICS_TIMEOUT_MS` optionally changes the server-side GraphQL
timeout from its 10 second default.

## Data model

The integration reads `httpRequestsAdaptiveGroups`. Site totals have no path,
host, bot, device, or request-source filter: `count` supplies Views and
`sum.visits` supplies Visitors. Product analytics add only the product URL path
needed to attribute traffic and scoring to the correct product. Browser,
operating-system, device, and country breakdowns use raw request counts.
Referrer and derived channel data are not queried or stored because the
production zone does not expose that dimension.

The raw view total includes pages, assets, APIs, crawlers, and Cloudflare paths.
Cloudflare does not expose GA-style unique users, bounce rate,
new/returning users, session duration, city, region, or custom events in this
dataset. The corresponding legacy database columns stay neutral.

Cloudflare may use adaptive sampling for GraphQL results. Scheduled ingestion
preserves the returned daily rollups in PostgreSQL.

Application requests read historical analytics through the Redis cache and
PostgreSQL provider only. The request path calls Cloudflare directly only for
the one-minute realtime visitor counter; scheduled ingestion remains the sole
writer of historical Cloudflare data.
