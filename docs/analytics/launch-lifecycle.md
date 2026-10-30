# Founder launch lifecycle (#133)

These are durable business events, independent of optional GA delivery:

- `submission_started`: a private ProductDraft successfully created. Opening a page alone does not count. Separate drafts are separate starts.
- `submission_completed`: a validated Product successfully saved as a private draft. Validation failure and checkout initiation do not count as publication.
- `first_published`: first actual publication by free-plan selection or a verified Dodo grant, in the same transaction as the status transition.

Unique kind/entity keys and createMany(skipDuplicates) deduplicate concurrent retries and republication. Draft deletion after completion and later product deletion preserve business history; deleting the account cascades its history. Event snapshots contain only normalized acquisition context from #132, never profile details. The intent report groups cohorts by first-touch landing/source in addition to self-reported intent/heard-from; unknown source remains explicit null.

Publication speed uses first_published.createdAt, never Product.createdAt. timingSampleSize identifies the denominator for medians. Speed bucket percentages remain percentages of the full cohort. The report's stages count users with recorded operations, not a strict nested session funnel. Users can start multiple drafts; a successful API-created product can have completion without a draft start.

The migration marks every existing product `legacy_history_unknown` at migration observation time. That timestamp is not used as a launch time. Even existing drafts are excluded from new first-publication timing because earlier publication cannot be ruled out. The summary explicitly returns the number of legacy products with unknown history. New starts/completions/publications are measured prospectively; historical funnel conversion rates must not be inferred from this partial history. Cache version changes to avoid serving the previous draft-as-launch semantics.

## Validation

528 unit tests, dependency/release checks, lint (14 existing warnings), formatting, typecheck:all and production build passed. New tests cover distinct stages, acquisition cohorts, actual publication timing and legacy unknowns. Existing paid projection tests now assert first-publication writes and no publication when an entire grant window was missed.

`check-launch-lifecycle.ts` checks the real isolated PostgreSQL transaction/unique constraint: private completion, rollback, concurrent publication deduplication, retained product history and account cascade. Its report is adjacent. The final migration was exercised on 517 local fixture products; all were marked legacy unknown. No real authentication or payment was performed; existing permission and verified billing guards remain in place.

## Deploy / rollback

Stacked on #157. Apply additive migration `20261031010000_launch_lifecycle` before deploying this application. No production migration or release was performed. Roll back the application before optionally dropping the event table; dropping it loses measurement history. No product statuses, billing grants or publication permissions are backfilled or changed by the migration.
