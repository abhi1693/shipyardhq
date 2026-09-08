# Carbon Ads implementation

Carbon uses zone `CWBI4KJN` and placement `shipyardhqdev`. Following Carbon's
September 2026 review, pages have at most one Carbon ad. The previous
custom API renderer, repeated feed placements, and creative CSS overrides have
been removed.

## Embeds

`CarbonAd` loads Carbon's hosted `carbon.js` with its standard `responsive`
format. Carbon owns the markup, creative selection, asset sizing, description,
attribution, click tracking, pixels, and viewability. Shipyard only provides a
container; it does not resize, crop, hide, replace, or restyle creative elements.
The script URL is defined in `lib/ads/config.ts`.

This follows the [placement policy](https://www.carbonads.net/placement-policy):
load the ad code once per page and retain the approved format and all elements.
The standard responsive format can render both image/text and rich campaigns;
any format-specific sizing comes from Carbon's unmodified script.

The homepage uses the supplied standard responsive embed with the confirmed production
zone `CWBI4KJN`. The supplied custom banner examples require logo, company, CTA,
and campaign color fields that this zone does not always return. A non-counting
preview returned an image/text creative without those fields. Using the hosted
renderer avoids broken images, blank sponsor labels, omitted assets, and a second
fallback ad request. It also supports rich creatives when the zone returns them.
The homepage unit is centered, uses the vendor's 400px maximum width, and remains
visible on mobile. Sidebar placements remain desktop-only. Each visible slot
reserves at least 155px, as in the supplied embed, during
loading, no-fill, and blocked loads. The supplied 960px custom template would
require compatible inventory from Carbon before use.

## Placements

| Pages                                              | Location                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Homepage `/`                                       | One standard responsive unit below the sponsored launch card and above the live launch board |
| `/browse`                                          | One unit above the sidebar filters                                                           |
| Taxonomy indexes, details and filtered directories | Below the sidebar statistics, when the sidebar has no sponsored products                     |
| `/products/[slug]`                                 | Carbon or the product partner spotlight, immediately above You may also like                 |
| `/leaderboard` and daily, weekly, monthly archives | Below the counters on the live leaderboard; one unit in archive sidebars                     |

Sidebar statistics precede the ad, so creative loading cannot push the counters
down. Product feeds, date sections, Rising Stars, and paginated lists contain no
Carbon placements. Sponsored product listings keep their existing links and
tracking. Tools, profiles, auth/member pages, and the pricing sales page contain
no Carbon placements.

The homepage placement follows the requested order: sponsored launch card,
Carbon, then the live launch board. The product-detail placement remains above
You may also like. These placements can sit below the initial desktop fold;
Carbon's published policy calls for visibility at 1366x768, so placement approval
remains a separate consideration from the single-ad and standard-format fixes.

## Lifecycle and network isolation

Standard sidebar slots are disabled below 1280px; the homepage banner is
responsive and available on mobile. A hidden slot makes no ad request and does
not claim the document. Resizing a sidebar slot to desktop loads the embed once. React Strict Mode,
rerenders, query filters, and pagination do not reload the embed.

A document-level `carbonAdRequested` claim permits only one Carbon embed for the
entire document lifetime. Additional components collapse, including after a
failed request or an unmount/remount. No application retry or refresh occurs.
Blocked scripts and no-fill leave the reserved 155px container in place. The vendor
handles its own serving lifecycle. No fallback network is added by Shipyard.

`AdDocumentBoundary` and `lib/ads/document.ts` retain network isolation across
public, auth, and member transitions. Once an ad network claims the document,
pathname changes use full document navigation, including browser history.
Same-path query and hash changes keep their existing behavior.

AdSense remains restricted to the guide allowlist in
`lib/adsense/placement.ts`. The CSP permits the hosted Carbon runtime.
`public/ads.txt` is unchanged.
No database schema changes or migrations are required.

## Validation

Run unit tests, ESLint, TypeScript, scoped Prettier checks, and a production
build. Regression checks cover duplicate mounts, remounts, failed loads, mobile
resizing, route exclusions, network isolation, and paginated product feeds.

Browser checks must use the unmodified vendor script with intercepted synthetic
campaign responses and assets. Verify one embed and one served creative,
complete text and attribution, template asset sizing, and no overflow on the
homepage, Browse, taxonomy, leaderboard, and product pages. Check mobile shows one homepage banner and no sidebar
Carbon requests, and that filters, pagination, and Back navigation do not create
extra ads in one document. Do not click tracked campaign links.

For a real serving check, use `?bsaignore=yes` to enable Carbon's non-counting
preview. Never synthesize paid impressions or clicks. Deployment and contacting
Carbon are separate actions; this implementation change does not publish a
release or send a message to Carbon.

Browser fixtures use the unmodified hosted runtime and synthetic creatives to
check complete assets, standard image dimensions, one unit per document, mobile
layout, and stable sidebar counters with delayed ad responses. Production-zone
checks use non-counting preview requests only.

Local validation passed: the full 421-test suite, 27 focused regressions after
the final reservation change, ESLint, scoped formatting, TypeScript, and the
production build. Desktop and mobile browser fixtures confirmed the requested
homepage order, 130x100 image dimensions, 155px reserved space, one embed per
document, and unchanged sidebar counters during delayed creative loading.
No release has been published.
