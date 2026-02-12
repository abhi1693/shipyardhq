# GA4 Data API (read-only) access — Shipyard HQ

Goal: enable programmatic queries (funnels, top pages, conversions) via the **Google Analytics Data API**.

## 1) Create a service account
In Google Cloud Console:
- Create a project (or reuse existing)
- Enable API: **Google Analytics Data API**
- IAM & Admin → Service Accounts → **Create service account**
- Create a JSON key (download once)

## 2) Grant access to the GA4 property
In GA4 Admin:
- Property → Access Management → Add users
- Add the service account email (looks like `xyz@<project>.iam.gserviceaccount.com`)
- Role: **Viewer** (or Analyst) — read-only

## 3) Store credentials securely (never commit)
Recommended env vars:
- `GA4_PROPERTY_ID` (numeric property id)
- `SHIPYARD_GA4_SERVICE_ACCOUNT_JSON_BASE64` (base64-encoded JSON key)
  - avoids multiline private key issues

Example:
```bash
export GA4_PROPERTY_ID="123456789"
export SHIPYARD_GA4_SERVICE_ACCOUNT_JSON_BASE64="$(base64 -w0 ./service-account-key.json)"
```

## 4) Sanity query
Run:
```bash
npx tsx scripts/ga4-sanity.ts
```

Expected: prints top `pagePath` rows by `screenPageViews` for last 7 days.

## Notes / security
- Treat the JSON key as a secret.
- Prefer storing the base64 blob in a secret manager / CI secret store.
- Rotate keys if exposed.
