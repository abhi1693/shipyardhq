# Canonical production hostname

The public origin is `https://shipyardhq.dev`. Next.js owns the permanent (308) `www.shipyardhq.dev` redirect in `next.config.ts`. Legacy paths on www resolve directly to their final apex destinations; queries are preserved. The exact www match leaves apex, local, staging and API subdomains unchanged.

The GitOps ingress at `home-lab/kubernetes/projects/applications/apps/shipyardhq/ingress.yaml` currently routes both apex and www through the Cloudflare Tunnel ingress class to the same `shipyardhq` service. Keep that www route and its DNS/TLS coverage so requests reach the application redirect. No hosting mutation is needed for this application change. A future edge redirect must preserve paths and queries, use HTTPS apex, and resolve legacy paths without extra hops. Avoid adding a competing reverse redirect.

Auth and billing callback configuration should continue to use the apex hostname. The redirect retains methods (308) and callback query strings, but clients registered against a www callback must be checked before deployment because their cookies and redirect-URI registrations are host-specific. No callback registration is changed here.

After deployment, check GET and HEAD through the actual delivery path for `/`, `/why-shipyard`, a real `/products/<slug>`, and `/pricing?utm_source=smoke`. Confirm www returns 308 with the expected Location, the apex target does not redirect back, and legacy `/rank-in-public?q=smoke` reaches apex `/browse?q=smoke` in one hop. Do not treat configuration tests as production evidence.
