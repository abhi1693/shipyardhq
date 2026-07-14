# Pricing & Plans

This file mirrors the production `Plan` and `PlanFeatureAssignment` rows verified through the `shipyardhq` Kubernetes workload.

## Customer-facing offer

The pricing page packages the catalog into three comparable tiers:

| Tier     | Default one-time offer |    Recurring option |     Launch window |
| -------- | ---------------------: | ------------------: | ----------------: |
| Free     |                     $0 |                   — | Permanent listing |
| Featured |             $9.99 once | $8.99 every 14 days |           14 days |
| Pro      |            $24.99 once |      $24.99 monthly |           30 days |

One-time pricing is selected by default. The recurring control is labeled “Keep my placement running.” The legacy 7-day Spotlight plan remains in production, but Featured is the canonical middle tier; Spotlight is used only when Featured is unavailable.

## Production catalog

| Slug                 | Type             |  Price |  Window | Enabled feature keys                                                                                   |
| -------------------- | ---------------- | -----: | ------: | ------------------------------------------------------------------------------------------------------ |
| `free`               | One-time/default |     $0 |   1 day | `analytics.basic`, `product.sitemap`                                                                   |
| `spotlight`          | One-time         |  $4.99 |  7 days | `analytics.basic`, `backlink`, `featured`, `product.sitemap`, `sponsoredProducts`                      |
| `featured`           | One-time         |  $9.99 | 14 days | `analytics.basic`, `backlink`, `featured`, `priorityPlacement`, `product.sitemap`, `sponsoredProducts` |
| `featured-recurring` | Every 14 days    |  $8.99 | 14 days | Same as `featured`                                                                                     |
| `pro`                | One-time         | $24.99 | 30 days | All Featured keys plus `analytics.advanced`, `partnerSpotlight`, `product.aiSearchReady`               |
| `pro-recurring`      | Monthly          | $24.99 | 30 days | Same as `pro`                                                                                          |

`product.aiSearchReady` has an explicit disabled assignment on both Featured plans in production.

## Fulfilled surfaces

- Free: public product page, standard homepage launch-feed card, standard Browse/directory discovery, basic product analytics, and product-sitemap inclusion.
- Featured: everything in Free, plus a sponsored card in the homepage launch feed, priority position in Browse and supported filtered result feeds, and a direct do-follow product-page link.
- Pro: everything in Featured, plus AI crawler/device/browser/location insights, AI-search ready badge and dedicated Markdown profile, and eligibility for the sitewide Partner Spotlight bar and product, leaderboard, and directory sponsor panels.

The `featured` entitlement is present in production data but does not currently create a `ProductBadge("featured")` when a plan is purchased. Do not promise a Featured badge until that fulfillment bridge exists.
