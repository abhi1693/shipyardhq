# Crawlable product pagination (#140)

Browse and category detail pages now honor a strict positive `page` parameter. Their server-rendered initial results, ItemList positions, canonical and WebPage data refer to that page. Previous/next anchors preserve other query parameters and omit page=1 on the first-page link. Infinite scrolling starts at the next page, retains existing cards and discards stale responses after navigation. Synchronous request locks prevent duplicate observer callbacks from advancing two pages. Browser testing also exposed a pre-existing 406 from Markdown negotiation on Server Action requests. Negotiation and document cache/discovery headers now exclude actions and RSC requests; existing Clerk path checks still run.

Valid page-only URLs on these two supported directory families are exempt from the proxy's blanket page noindex rule. Search/filter/alternate-sort metadata retains noindex; unsupported directory families retain their existing page noindex rule. Category inventory thresholds still apply. Each database ordering has a stable id tiebreaker. This is a live directory rather than a frozen snapshot: new launches, upvotes and paid placement expiry can naturally reorder results between requests.

Malformed, duplicate and out-of-range page values render Next's notFound state with noindex and no repeated listing. With the existing streamed App Router shell these responses can have HTTP 200; the HTTP report records the actual status rather than claiming a hard 404. HTML and final GET/HEAD robots headers are checked separately. Canonical origin in the local report is localhost:3000 from the local site configuration.

## Validation

521 unit tests, dependency checks and 9 release contract checks passed. Lint has 14 existing warnings; formatting, typecheck:all and production build passed. New tests cover strict parsing, anchors, query rules, duplicate observer callbacks and navigation during an in-flight response.

`python3 scripts/check-directory-pagination.py` runs against the built local server on port 3140. Checked-in http-checks.json covers three distinct pages in Browse and the seeded Developer Tools category, initial HTML anchors, ItemList positions, self-canonicals, GET/HEAD headers, filters and invalid/out-of-range states. The local AI category has no fixture inventory, so the populated Developer Tools category exercises the same generic route. Browser scroll evidence checks that page two's twelve products append exactly page three's twelve. Screenshots show desktop Browse and mobile category navigation; observer autoload is paused for the screenshots so the requested page remains visible.

## Other template audit

Use-case detail, platform, pricing-model, product-type, user-index and user-profile templates also initialize client feeds at page one. This PR deliberately supports public product pagination on Browse and categories first. Their other page URLs remain noindex at the proxy; the exception is not widened to routes that still ignore page. TODO: extend the same server URL/content/canonical contract to those families with family-specific filter and inventory checks before relaxing their indexing controls. Product-slice helpers already accept parsed page filters, but several callers supply fixed defaults.

No schema changes, migration or deployment. Roll back this application change to restore the previous rendering/query controls. Guidance followed: [Google pagination and incremental page loading](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).
