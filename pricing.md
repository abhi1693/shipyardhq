# Pricing & Plans

Clear, fair tiers that start generous and scale with growth. Free is the default so every product can launch confidently; upgrades add visibility and time‑boxed spotlighting.

## Plan Summary

| Plan           | Type                |        Price |          Boost Window | Included Feature Keys                                                                                                      | Primary Value                                                                        |
| -------------- | ------------------- | -----------: | --------------------: | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Free (Default) | Default             |           $0 |                     — | `analytics.basic`, `product.sitemap`, `backlink`                                                                           | Public listing, product page, browse visibility, basic analytics, do‑follow backlink |
| Pro            | One‑time (lifetime) | $19 one‑time | Time‑boxed placements | `priorityPlacement`, `featured`, `sponsoredProducts`, `stickyBanner`, `product.sitemap`, `backlink` | Stronger page + premium surfaces + visibility bump                                   |
| Team           | One‑time (lifetime) | $49 one‑time | Time‑boxed placements | All Pro features                                                                                                           | Extra visibility for larger launches                                                 |

Notes

- Keep Free feeling complete: listing + upvotes + product page + basic click/upvote analytics.
- Reserve sponsored placement/featured/banner surfaces for Spotlight to protect feed quality.
- Pro remains compelling via ongoing outcomes: traffic lift + better on‑page conversion + earlier access.

## Feature Comparison

| Feature Key           | Free | Pro | Team | Spotlight |
| --------------------- | :--: | :-: | :--: | :-------: |
| `analytics.basic`     |  ✓   |  ✓  |  ✓   |
| `priorityPlacement`   |  —   |  ✓  |  ✓   |
| `featured`            |  —   |  ✓  |  ✓   |
| `sponsoredProducts`   |  —   |  ✓  |  ✓   |
| `stickyBanner`        |  —   |  ✓  |  ✓   |
| `backlink`            |  ✓   |  ✓  |  ✓   |
| `product.sitemap`     |  ✓   |  ✓  |  ✓   |

## Implementation Notes

- Plans
  - Free: create a `Plan` with `price=0`, `isDefault=true`.
  - Pro/Team: `Plan.type=one_time_price` (lifetime entitlements); assign Pro features including former Spotlight surfaces (`featured`, `sponsoredProducts`, `stickyBanner`).
- Feature Keys: use the existing constants in `lib/constants.ts` for `PlanFeature` records.
- Entitlements
  - Pro/Team purchases grant lifetime feature access; time‑boxed placements can still be scheduled editorially (use `boostForDays` if desired per placement).
  - Product page UI should reference assignments via `lib/features.ts` helpers.

Pricing can be tuned later; the structure keeps Free generous while upgrades deliver tangible, trustworthy value.
