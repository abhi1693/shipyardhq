# Carbon Ads rollout

## Installed placements

The standard Carbon tag uses zone `CWBI4KJN` and placement `shipyardhqdev`.
`CarbonAd` loads the dashboard script unchanged, once per document, inside a
container with the supplied minimum height (280px Cover, 155px Responsive).

| Pages                                                    | Format and location                                      |
| -------------------------------------------------------- | -------------------------------------------------------- |
| Homepage `/`                                             | Responsive, centered below the search and action buttons |
| `/browse`                                                | Responsive, above the browse sidebar filters             |
| Taxonomy indexes, detail pages, and filtered directories | Responsive, first item in the sidebar                    |
| `/products/[slug]`                                       | Responsive, first item in the product sidebar            |
| `/leaderboard` and daily, weekly, monthly archives       | Responsive, first item in the existing sidebar           |

The centered headings, search controls, typography, feed widths, and product
cards are preserved. The shared Page guide component and all of its placements
were removed, including the homepage variant labeled Shipyard, explained.
Taxonomy detail heroes use slightly tighter desktop spacing. Pages with a new
ad-only sidebar also reduce the gaps between the heading, actions, and metrics
to keep the entire ad visible at 1366 x 768.
Taxonomy coverage includes categories, use cases, tags, alternatives, platforms,
product types, pricing-model directories, filtered combinations, verified/editor
picks, and category trends. The pricing sales page and all tool pages have no ads.
Filtered pages gain a sidebar only at desktop ad widths; mobile keeps the full
content width.

Slots only display and load at viewport widths of 1280px and above. Smaller
screens make no Carbon request, following the mobile-disable option in the
[placement policy](https://www.carbonads.net/placement-policy). Resizing to a wide
viewport loads the slot once. All creative elements and Carbon attribution
remain intact. There is no timed refresh or backfill. A script-load failure
removes the slot; an empty vendor response leaves the reserved space without
substituting another ad network.

## Network isolation

AdSense remains only on the existing guide allowlist in
`lib/adsense/placement.ts`:

- `/guides/product-launch-checklist`
- `/guides/startup-backlinks-domain-rating`
- `/guides/submit-product-to-directories`

Discovery, profile, and repeated feed templates no longer mount AdSense units.
Shipyard's own sponsored launch inventory and `/r/sponsored/:slug` tracking
remain. The leaderboard's separate Dodo affiliate banner was removed.

`AdDocumentBoundary` is mounted in the root layout so it survives public, auth,
and member route transitions. Together with `lib/ads/document.ts`, it prevents either network loading in
a document already claimed by the other. Once an ad has loaded, links to a new
pathname use a full document navigation so executed ad code, callbacks, and
observers do not survive onto another page. Programmatic and history navigation
also reload the document when necessary. Same-path filters, query changes,
hash links, and new-tab interactions keep their existing behavior. Mobile
Carbon slots do not claim the document.

The Content Security Policy allows Carbon's CDN, serving endpoint, and BuySellAds
support endpoints. Existing Google permissions and `public/ads.txt` remain for
the guides. No Carbon seller entry was supplied, so none was invented. Privacy
and editorial policies describe the split and Carbon's browser requests.

## Local validation and live confirmation

Validation on September 8, 2026: ESLint, scoped Prettier checks, all 401 Vitest
tests, and the production build passed. The removed Page guide component had two
tests, which were removed with it. Browser checks covered 22 populated taxonomy
index/detail/filter routes at 1366 x 768, using a long test creative. All 22 ads
fit above the fold and were the first item in their sidebar. The local tag index
has no detail entries, so tag-detail placement is covered by the shared template
and route checks rather than a populated browser preview.

Mobile checks confirmed no Carbon requests and no horizontal overflow on taxonomy
indexes, detail pages, and filtered pages. Navigating from a Carbon taxonomy page
to the tool index and SEO Audit discarded the advertising document; both SEO
Audit and Meta Tag Generator had no ad slot or ad tag. Tool templates are unchanged.
Earlier checks covered discovery pages, browse search, leaderboard archives, and
navigation between Carbon discovery pages and AdSense guides.

Verified and editor-pick routes now load the shared taxonomy stylesheet. The
category-trends page resolves its traffic sidebar with the page data to avoid
nested streamed content reusing a React segment identifier during hydration.
Production checks confirmed unique HTML identifiers and no rendering errors with
a served test ad, a blocked ad script, and a mobile viewport.

The product ad is the first sidebar item, above rankings, details, sponsored
launches, and You may also like. Its position no longer depends on the height of
product metadata or sponsor cards. Regression checks also cover returning from
a Carbon homepage to login with browser Back.

Playwright checks use the current unmodified vendor script with intercepted ad
responses containing a clearly labeled local test creative. They check desktop
and mobile placement, one unit per page, absence of the other network, and
navigation between discovery and an AdSense guide. Local fixture checks do not
confirm real ad serving or Carbon's approval of the placement.

After deployment, verify a real ad on an exact public page such as
`https://shipyardhq.dev/browse`, allow the stated 15–30 minutes for serving, and
provide that link for the user's reply to Roger. His email requires installation
and live confirmation within seven days of the email date; that date was not
included in the supplied message. The release is deployed through the home-lab Fleet manifests. The user sends
the placement link to Roger after live serving is confirmed.

## Release dependencies

The release updates Next.js to 16.3.4 and aligns the Prisma CLI, client, and
PostgreSQL adapter on 7.10.0. Targeted overrides select patched Jaeger propagation,
DeepmergeTS, and MySQL2 dependencies without changing the application APIs. The
lockfile refresh removes the remaining dependency-audit findings. There are no
schema or migration changes.
