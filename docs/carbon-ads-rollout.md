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
Public Carbon pages share `PublicAdLayout`. The main content stays centered in
the viewport at every width. From 1200px, its width shrinks symmetrically to
reserve equal margins on both sides; only the right margin contains Carbon.
The ad grows from 240px to 300px (`clamp(240px, 20vw, 300px)`). The content width
is the available parent width minus twice the ad width and 24px edge spacing,
capped at 1240px. It reaches the original maximum on wide screens.

The ad wrapper stays 24px above the viewport bottom while scrolling through the
page content, or 88px above it when the fixed partner bar is present. It stops
at the end of the content before the footer. Sticky positioning is disabled
below 480px viewport height. Internal page columns use the named `public-ad`
container's available width: filters, statistics, and product details stack when
the centered content is too narrow for their desktop columns. The homepage's
sponsored launch and traffic chart also stack based on available content width.

Below 1200px, the same responsive unit appears centered before the page content,
below the hero where present. The homepage keeps its sponsored launch, Carbon,
live launch board order on those screens. The vendor retains its 400px maximum
width. CSS moves the single placement without remounting or requesting another
ad. Each visible slot reserves at least 155px during loading, no-fill, and
blocked loads. Member placements keep their existing layout. The supplied
960px custom template would require compatible inventory from Carbon before use.

## Placements

| Pages                                              | Location                                                                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Homepage `/`                                       | One sticky right-margin unit beside sponsored launch and the feed; inline after sponsored launch on narrower screens |
| `/browse`                                          | Shared right-margin unit outside the results and filters; inline below the hero on narrower screens                  |
| Taxonomy indexes, details and filtered directories | Shared right-margin unit outside the directory and sidebar; inline below the hero on narrower screens                |
| `/products/[slug]`                                 | Shared right-margin unit outside product content and the sidebar; inline before product content on narrower screens  |
| `/leaderboard` and daily, weekly, monthly archives | Shared right-margin unit outside rankings and the sidebar; inline before page content on narrower screens            |
| `/member/overview`                                 | One responsive unit directly below Launch Activity and above Partner Spotlight                                       |
| `/member/products/[slug]`                          | One responsive unit directly below Public Listing Preview                                                            |

Carbon loading does not move sidebar content. Sidebar sponsors do not suppress the ad.
Product feeds, date sections, Rising Stars, and paginated lists contain no
Carbon placements. Sponsored product listings keep their existing links and
tracking. Tools, public profiles, sign-in, onboarding, and the pricing sales page
contain no Carbon placements. Member navigation sidebars and member product
lists, creation, edit, analytics, upgrade, and delete pages contain no Carbon
placements. Member units sit inside the authenticated page content; the overview
first-launch empty state has no Launch Activity or ad.

## Lifecycle and document isolation

Public Carbon units, member overview, and member product detail units are
responsive and available on mobile. The overview ad follows Launch
Activity in the content column with the existing 24px spacing. It is outside the
navigation sidebar and reserves at least 155px while loading. Member product
details center the same responsive unit below Public Listing Preview, with the
existing section spacing. A hidden slot makes
no ad request and does not claim the document. Resizing between inline and
right-margin layouts retains the same embed. React Strict Mode, rerenders, query filters, and
pagination do not reload the embed.

A document-level `carbonAdRequested` claim permits only one Carbon embed for the
entire document lifetime. Additional components collapse, including after a
failed request or an unmount/remount. No application retry or refresh occurs.
Blocked scripts and no-fill leave the reserved 155px container in place. The vendor
handles its own serving lifecycle. No fallback network is added by Shipyard.

`AdDocumentBoundary` and `lib/ads/document.ts` retain document isolation across
public, auth, and member transitions. Once Carbon claims the document,
pathname changes use full document navigation, including browser history. This
also isolates member ads when leaving for another member page. Member pages
without an ad claim retain their normal client navigation.
Same-path query and hash changes keep their existing behavior.

Guides contain no third-party ad placements. The CSP permits the hosted Carbon
runtime. The obsolete Google publisher entry and its `public/ads.txt` file have
been removed.
No database schema changes or migrations are required.

## Validation

Run unit tests, ESLint, TypeScript, scoped Prettier checks, and a production
build. Regression checks cover duplicate mounts, remounts, failed loads, mobile
resizing, route exclusions, document isolation, and paginated product feeds.

Browser checks must use the unmodified vendor script with intercepted synthetic
campaign responses and assets. Verify one embed and one served creative,
complete text and attribution, template asset sizing, and no overflow on the
homepage, Browse, taxonomy, leaderboard, and product pages. Check each public
Carbon page at mobile, 1199px, 1200px, 1258px, and wide desktop widths. Verify centered
content, an inline ad below the breakpoint, right-margin placement above it,
sticky scrolling in both directions, and clearance above the footer and partner
bar. Check mobile shows one responsive unit, and that filters, pagination, and Back navigation do not create
extra ads in one document. Do not click tracked campaign links.

For a real serving check, use `?bsaignore=yes` to enable Carbon's non-counting
preview. Never synthesize paid impressions or clicks. Contacting Carbon remains a separate action from the application release.

Browser fixtures use the unmodified hosted runtime and synthetic creatives to
check complete assets, standard image dimensions, one unit per document, mobile
layout, and stable sidebar counters with delayed ad responses. Production-zone
checks use non-counting preview requests only.

Shared public layout checks cover 1200px and wider right-margin placement,
bottom offsets while scrolling in both directions and extending the feed,
footer and partner-bar clearance, inline order on smaller screens, and disabling
sticky positioning on short viewports. Resizing must retain the same embed
without another ad request. Use both standard and rich synthetic creatives.

Member placement checks cover the overview ad directly after Launch Activity,
the member product detail ad directly after Public Listing Preview, no ad in the
navigation sidebar or other member pages, responsive layout, and one request per
document. Use an isolated fixture with the real page and sidebar components when no signed-in browser session is available; keep authentication
enforced in the application itself.

### Centered desktop sidebar validation

The 1200px layout passed all 457 unit tests, ESLint, scoped formatting, and the
production build including TypeScript. Chromium checked 31 routes covering every
public page type that mounts this layout, with both standard and rich synthetic
creatives through the unmodified Carbon runtime. All 62 scenarios passed at
375, 768, 1024, 1199, 1200, 1258, 1280, 1366, 1440, 1536, 1888, 1920, and 2560px.

Checks measured main content centering within one pixel of the viewport center,
right-margin placement from 1200px, inline placement below it, no horizontal
overflow or content overlap, and one runtime and creative request per document
across all resizes. Scrolling in both directions, footer clearance, and disabling
sticky positioning at 400px height passed. Additional homepage and Browse checks
covered delayed, blocked, and no-fill responses without horizontal movement,
155px empty-slot reservations, and 24px/88px bottom offsets with the partner bar.

Coverage includes homepage, Browse, all six taxonomy indexes, each taxonomy
detail type, pricing models, all seven filtered-directory patterns, verified
and editor-pick directories, category trends, product detail, leaderboard, and
daily, weekly, and monthly archives, including the legacy monthly redirect.
The previous 1888px layout is recorded below for release history.

### Earlier shared public layout validation (1888px breakpoint)

The public ad cleanup passed all 457 unit tests, ESLint, scoped formatting,
and the production build including TypeScript. Chromium checks covered nine
representative pages at 375, 768, 1280, 1536, 1887, 1888, 1920, and 2560px.
Content stayed centered, with no horizontal overflow and exactly one runtime
and creative request per document across resizes. Both scrolling directions,
footer boundaries, and short viewports passed. Additional rich-creative checks
covered the homepage and Browse, including a partner bar and extended feed.
Campaign responses and assets were synthetic; the hosted runtime was unmodified.
The three guide pages render their content without ad elements or ad requests.
Built assets contain no obsolete Google ad integration, and `/ads.txt` returns
404 after removing the former publisher entry.

### Earlier release validation

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
