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

The initial server HTML includes a low-priority preload for that exact script
and an anonymous preconnect to Carbon's serving host. This overlaps the script
download and connection setup with application loading. Preloading does not
execute the script or request a creative; the existing client effect still owns
execution, visibility checks, and the one-ad document claim. Desktop-only slots
use a `(min-width: 1280px)` preload media condition. Client-side transitions use
the existing guarded loader instead of issuing speculative ad requests.

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
The homepage unit uses a 300px right column on wide desktops (1536px and up),
starting beside the sponsored launch section. Its wrapper stays 24px above the
viewport bottom while scrolling through the launch feed, staying within that
section and stopping before the footer. The right column aligns the wrapper at
its end so bottom sticky positioning follows downward and upward scrolling. Sticky positioning is disabled below 480px viewport height. On
narrower screens the same unit stays centered between the sponsored launch and
the live launch board, using the vendor's 400px maximum width. CSS moves the
single placement between layouts without remounting or requesting another ad.
Other public sidebar placements remain desktop-only. Each visible slot
reserves at least 155px, as in the supplied embed, during
loading, no-fill, and blocked loads. The supplied 960px custom template would
require compatible inventory from Carbon before use.

## Placements

| Pages                                              | Location                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Homepage `/`                                       | One sticky right-column unit beside sponsored launch and the feed on wide screens; inline below sponsored launch on smaller screens |
| `/browse`                                          | One unit above the sidebar filters                                                                                                  |
| Taxonomy indexes, details and filtered directories | One unit after sidebar statistics and any sponsored products                                                                        |
| `/products/[slug]`                                 | One Carbon unit after the optional partner spotlight, immediately above You may also like                                           |
| `/leaderboard` and daily, weekly, monthly archives | After counters and any partner spotlight on the live leaderboard; one unit in archive sidebars                                      |
| `/member/overview`                                 | One responsive unit directly below Launch Activity and above Partner Spotlight                                                      |
| `/member/products/[slug]`                          | One responsive unit directly below Public Listing Preview                                                                           |

Sidebar statistics precede the ad, so creative loading cannot push the counters
down. Sidebar sponsors do not suppress Carbon; the single unit follows them.
Product feeds, date sections, Rising Stars, and paginated lists contain no
Carbon placements. Sponsored product listings keep their existing links and
tracking. Tools, public profiles, sign-in, onboarding, and the pricing sales page
contain no Carbon placements. Member navigation sidebars and member product
lists, creation, edit, analytics, upgrade, and delete pages contain no Carbon
placements. Member units sit inside the authenticated page content; the overview
first-launch empty state has no Launch Activity or ad.

The homepage placement is alongside sponsored launch and the feed on wide
screens; its mobile order is sponsored launch, Carbon, then the live launch
board. Product-detail pages show Carbon after the
partner spotlight, when present, and above You may also like. These placements
can sit below the initial desktop fold;
Carbon's published policy calls for visibility at 1366x768, so placement approval
remains a separate consideration from the single-ad and standard-format fixes.

## Lifecycle and network isolation

Public sidebar slots are disabled below 1280px; the homepage, member overview,
and member product detail units are responsive and available on mobile. The overview ad follows Launch
Activity in the content column with the existing 24px spacing. It is outside the
navigation sidebar and reserves at least 155px while loading. Member product
details center the same responsive unit below Public Listing Preview, with the
existing section spacing. A hidden slot makes
no ad request and does not claim the document. Resizing a public sidebar slot to
desktop loads the embed once. React Strict Mode, rerenders, query filters, and
pagination do not reload the embed.

A document-level `carbonAdRequested` claim permits only one Carbon embed for the
entire document lifetime. Additional components collapse, including after a
failed request or an unmount/remount. No application retry or refresh occurs.
Blocked scripts and no-fill leave the reserved 155px container in place. The vendor
handles its own serving lifecycle. No fallback network is added by Shipyard.

`AdDocumentBoundary` and `lib/ads/document.ts` retain network isolation across
public, auth, and member transitions. Once an ad network claims the document,
pathname changes use full document navigation, including browser history. This
also isolates member ads when leaving for another member page. Member pages
without an ad claim retain their normal client navigation.
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
preview. Never synthesize paid impressions or clicks. Contacting Carbon remains a separate action from the application release.

Browser fixtures use the unmodified hosted runtime and synthetic creatives to
check complete assets, standard image dimensions, one unit per document, mobile
layout, and stable sidebar counters with delayed ad responses. Production-zone
checks use non-counting preview requests only.

Homepage layout checks cover 1536px and wider right-column placement, the 24px
bottom offset while scrolling in both directions and extending the feed, stopping before the footer,
inline order on smaller screens, and disabling sticky positioning on short
viewports. Seven browser fixture scenarios passed for the bottom positioning,
including rich creatives, feed growth, reverse scrolling, footer boundaries, and
responsive layouts. Resizing retains the same embed without another ad request.

Member placement checks cover the overview ad directly after Launch Activity,
the member product detail ad directly after Public Listing Preview, no ad in the
navigation sidebar or other member pages, responsive layout, and one request per
document. Use an isolated fixture with the real page and sidebar components when no signed-in browser session is available; keep authentication
enforced in the application itself.

Local validation passed: 107 focused ad regression checks, ESLint, scoped
formatting, TypeScript, and the production build. Six overview browser fixture
scenarios passed: desktop, rich creative, tablet, mobile, blocked script, and
first-launch empty state. The navigation sidebar remained ad-free, Launch
Activity stayed in place during ad loading, and no horizontal overflow occurred.
Five member product detail fixture scenarios also passed: desktop, rich creative,
tablet, mobile, and blocked script. Each ad followed Public Listing Preview with
24px spacing and no navigation sidebar ad or horizontal overflow.
Loading checks on the local production build confirmed script downloads start
before hydration and reuse one response, including on the mobile homepage.
Mobile sidebar downloads wait for the desktop breakpoint; blocked preloads do
not trigger retries. Controlled script and application delays isolate this
loading behavior from changes in Carbon serving latency.
Release `1.5.25` also packages `public` and `.next/static` into the standalone
output from `npm run build`; the Docker entrypoint uses that shared build step.
A clean install using the locked dependencies passed all 451 tests and lint.
The standalone build served all 13 generated stylesheets with HTTP 200 and the
correct content type. Desktop and mobile browser checks confirmed loaded CSS,
correct layout, no horizontal overflow, and no failed static assets.
