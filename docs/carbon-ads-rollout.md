# Carbon Ads rollout

## Templates and placements

Carbon uses zone `CWBI4KJN` and placement `shipyardhqdev`. Release 1.5.21 adds
native sidebar and feed layouts with spacing around sponsored products. The
release has no database schema changes; rollback uses the 1.5.20 application
image and matching build artifact through Fleet.

Release 1.5.22 keeps taxonomy launch grouping and date labels in UTC. Live
monitoring of 1.5.21 found that browsers in Asia/Kolkata moved late UTC launches
into a different day, causing a hydration mismatch and regrouping products.
UTC boundaries keep the initial server markup, pagination sections, and ad
spacing stable in every visitor timezone.

`CarbonAd` renders a compact sidebar card. `CarbonFeedAd` renders a horizontal
row between products. Both use the direct browser
[Ad Serving API](https://docs.buysellads.com/ad-serving-api) to select a template
before inserting any creative into the page. Each has its own request and
lifecycle. No vendor script, global callback, HTML placeholder replacement, or
post-render image repair is needed.

The [Custom Templates](https://docs.buysellads.com/custom-templates) example uses
Native Network's square `image` and wider `logo` assets. Carbon also supplies
130x100 `smallImage` creatives and rich campaigns with `largeImage`, logo and
tagline. These are different creative types, not interchangeable images:

| Creative assets                        | Template                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Artwork, logo, company and tagline     | Rich card/row retaining artwork, logo, tagline, company, full description and supplied CTA |
| Carbon `smallImage`                    | Image/text layout, 130x100 in sidebars and 104x80 in feeds                                 |
| Native Network `image`                 | Icon/text layout, 40x40 icon with padding and the supplied background color                |
| Logo asset                             | Logo/text layout, 125x50 logo with padding and the supplied background color               |
| Company and copy, without image assets | Text layout, as permitted by BSA's optional-image Native Network contract                  |

The templates follow Shipyard's typography, white cards, subtle borders, rounded
corners and blue links. Assets retain their proportions without cropping. Copy
is rendered as React text, never campaign-provided HTML. Both template footers
have an explicit Carbon destination and separate Sponsored / ads via Carbon
labels; the destination does not depend on an optional campaign placeholder.

| Pages                                              | Location                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Homepage `/`                                       | One feed row per populated launch section when spacing permits; no hero ad                 |
| `/browse`                                          | Sidebar card above filters, plus one ad in Fresh Finds and one below the Rising Stars grid |
| Taxonomy indexes, details and filtered directories | Card first in the sidebar; one feed ad per populated product-list section                  |
| `/products/[slug]`                                 | Partner spotlight or Carbon directly above You may also like, after product metadata       |
| `/leaderboard` and daily, weekly, monthly archives | Card first in the existing sidebar                                                         |

Sponsored products and Carbon can appear in the same section. Carbon is placed
at the earliest position with at least **three regular products** between it and
every sponsored/promoted product on either side. The rule recognizes `sponsored`,
`isSponsored`, and the `sponsored`/`promoted` variants. Neighboring sections are
included in the spacing check; a heading alone does not separate promotions.

If a section is too short or crowded to provide that gap, it keeps its sponsored
products and omits Carbon until enough regular products are available. Rising
Stars keeps its compact grid and can show Carbon below it only when the same
spacing rule is satisfied, including the start of Fresh Finds.

Browse and taxonomy pagination render initial and subsequently loaded products
from one state. An arriving sponsor can move Carbon to another valid position,
keeping the same creative and request, or remove it if no valid position exists.
Initial products remain server-rendered. Each section still has at most one
Carbon ad; empty sections have none. Sponsored products and their tracking stay
in their existing positions.

Compact sidebars have no regular product rows to provide this separation, so
taxonomy sponsors and the leaderboard's partner spotlight take priority there.
`DetailPromotionSlot` selects the product partner spotlight when available and
Carbon otherwise, immediately above You may also like.

The shared Page guide component and all its placements were removed. Taxonomy
coverage includes categories, use cases, tags, alternatives, platforms, product
types, pricing-model directories, filtered combinations, verified/editor picks,
and category trends. Tools, profiles and the pricing sales page have no Carbon.

## Loading and tracking

Slots only display and request ads at widths of 1280px and above. Resizing to a
wide viewport loads each slot once. Same-path filters do not refresh ads. Empty,
blocked and invalid responses collapse their slot without another request or ad
network. Unmounting aborts pending requests and removes viewability observers.
Sidebars reserve 155px while loading; feed rows reserve 106px. Longer creative
copy can increase these heights and is never truncated.

Requests are uncached, browser-direct and include the actual browser user agent.
The vendor sees the visitor's address; no application server IP or invented
forwarded IP is supplied. `?bsaignore=yes` enables the documented non-counting
preview mode; `bsaforcebanner` is also passed through for campaign previews.

Tracked click URLs and optional campaign pixels are preserved. Pixel timestamps
and placement macros are expanded. Viewability is enabled only when the campaign
sets `should_record_viewable=1`, after the main creative image loads (or the
text-only creative mounts) and at least half the card is continuously visible
for one second. It fires once. No additional impression endpoint is requested.
Executable URL schemes are rejected.

## Network isolation

AdSense remains only on the guide allowlist in `lib/adsense/placement.ts`:

- `/guides/product-launch-checklist`
- `/guides/startup-backlinks-domain-rating`
- `/guides/submit-product-to-directories`

`AdDocumentBoundary` lives in the root layout, surviving public, auth and member
route transitions. `lib/ads/document.ts` prevents either network loading in a
document claimed by the other. After an ad request, a new pathname causes a full
document navigation, including history navigation. Same-path query and hash
changes keep their existing behavior. Hidden mobile slots do not claim the
document. Shipyard's sponsored inventory is unaffected; the leaderboard's Dodo
affiliate banner was removed.

Existing CSP permissions cover the direct serving API and creative images.
Google permissions and `public/ads.txt` remain for guides. No Carbon seller entry
was supplied, so none was invented. No schema or migration changes are required.

## Validation and Carbon confirmation

Browser checks must cover image/text, logo/text and rich creatives in both
sidebar and feed templates, including responses without `image` or
`ad_via_link`. Check one request per slot, no broken images, no empty links,
complete attribution, no overflow, and no ads on mobile, tools or auth pages.
Also verify no fill, blocked requests, campaign pixels, opted-in viewability,
pagination stability, Carbon/AdSense isolation and browser Back navigation.

Validation on September 8, 2026: all 454 tests, ESLint, scoped Prettier checks,
TypeScript and the production build pass. Production-browser checks covered all
five creative types on Browse, plus homepage, category index/detail, platform,
leaderboard and product placements. They confirmed the product ad immediately
precedes You may also like, no missing images or attribution links, one request
per slot, and no overflow. Mobile, tools, auth, browser Back, AdSense navigation,
no-fill/blocked responses, campaign pixels and opt-in viewability checks pass.
Spacing regression tests cover both promotion types in one section, three
regular products on either side, neighboring section boundaries, crowded short
grids, and movement of an existing ad during Browse/taxonomy pagination without a
new request. Compact sidebar priority is also covered. A browser fixture using
the actual product-row and Carbon components confirms the order sponsor / three
regular products / Carbon / three regular products / sponsor. Moving the ad
when a sponsor arrives preserves the same creative and makes no new request.
Production HTML checks also confirm initial Browse
and platform product lists and headings remain available without JavaScript.
Real campaigns and creative images also loaded on Browse and the homepage in
non-counting preview mode. The rich feed row measured 116px in the test fixture.

Fixture campaigns must use intercepted assets and synthetic tracking URLs so
checks never record paid clicks or production impressions. Real serving checks
use `?bsaignore=yes`. `/products/unshift` exists in local seed data; live checks
must use a currently listed product.

Roger explicitly offered API rendering for this custom platform. The custom
appearance, repeated section placements and lower product placement still need
Carbon's confirmation. The public
[placement policy](https://www.carbonads.net/placement-policy) describes approved
formats and visibility on initial desktop load at 1366x768. The user specifically
requires the product ad directly above You may also like; do not move it to the
top of the sidebar to satisfy a fold check. Its current starting position can be
around y=746 with the local product metadata.

After an authorized deployment, verify an exact public page such as
`https://shipyardhq.dev/browse`, allowing the stated 15–30 minutes for serving.
The user can send that link and the requested placement changes to Roger for
confirmation. His email requires installation within seven days, but its date
was not provided. Do not contact Roger without explicit authorization.
