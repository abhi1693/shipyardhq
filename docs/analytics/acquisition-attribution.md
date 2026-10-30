# Acquisition attribution (#132)

Public landing paths and coarse source/medium/referrer hosts are allowlisted before persistence. First touch is immutable; the conversion visit is stored separately. Raw URL queries, auth callbacks, emails and profile details are excluded from server event payloads. Actual browser tag identifiers are captured when available; blocked/missing identifiers remain unknown. Checkout metadata carries the sanitized snapshot to a verified payment webhook.

`AnalyticsConversion.key` prevents duplicate attempts across workers. Delivery is deliberately at most once: an ambiguous timeout or a crash after reserving a key is not retried automatically. This can undercount; it does not certify exactly-once GA ingestion. Debug endpoint success requires an empty validationMessages array, not merely HTTP 200. Production credentials and real end-to-end auth/payment ingestion still require staging/property verification. The checked-in reports use synthetic identifiers and Google's non-recording validator only.

Account deletion cascades to conversion rows. The attribution cookie expires after 180 days; privacy copy describes this collection. No customer identifiers are substituted for GA browser identifiers.

## Validation

Full unit suite (525 tests), dependency/release checks, lint, formatting, typecheck:all and production build passed. `validate-acquisition-events.ts` validates signup and purchase payload schemas. `check-acquisition-ledger.ts` refuses nonlocal databases and checks atomic first-touch preservation, duplicate delivery reservation and account-deletion cleanup against isolated PostgreSQL. Reports are adjacent to this file. UI screenshot: [privacy disclosure](../pr/132/privacy-desktop.png).

## Migration and rollback

Deploy additive migration `20261031000000_acquisition_attribution` before the application. No production migration was run. Roll back the application first. The nullable User column and ledger table may remain; dropping them later loses attribution history only. Billing/publication permissions are unchanged. Existing email-based Clerk linking remains owned by the separate authentication backlog.
