# HTML/Markdown delivery investigation

Issue: #143. This is an investigation and repeatable contract check, not a completed routing or hosting fix.

## Confirmed cause

With installed Next.js 16.4.2, `proxy.ts` appends `Accept` to the response Vary header. The App Page render template later calls `routeModule.getVaryHeader(...)` and sets Vary to that result. The method returns Next's RSC variation fields. This replaces the earlier proxy value for HTML. The relevant installed sources are:

- `node_modules/next/dist/build/templates/app-page-runtime.js`, in the render handler around lines 466–467.
- `node_modules/next/dist/server/route-modules/app-page/module.js`, `getVaryHeader` around lines 162–172.

Markdown is served through the distinct rewritten route-handler path, whose response retains Accept variation and its intentional noindex header. Adding another proxy/header assignment before App Page rendering would not resolve the overwrite. No installed framework files are patched here.

## Delivery evidence

`143-production-negotiation.json` records read-only requests through `https://shipyardhq.dev`, including both warming orders for pricing and Why Shipyard, GET/HEAD metadata, and explicit `.md` URLs. Body format is checked as well as content type and robots headers; a 200 alone is not treated as proof.

The observed header contract fails because final HTML lacks Accept. The checked requests did not reproduce a mixed HTML/Markdown body or a leaked noindex header. Cloudflare's recorded DYNAMIC responses do not establish that either representation entered its public cache, nor do they prove a configured cache key would separate Accept variants if caching were enabled.

Next's rewritten HTML and Markdown destinations provide distinct origin route identities. That is separate from an upstream cache's key for the original public URL. The current origin's cache-control permits shared caching, so a future intermediary needs an explicit representation-aware key or public caching must be disabled for the negotiated URL. Vary alone must not be assumed to change every CDN's cache key.

## Repeatable check

Run against a deployed hostname or a running production build:

```sh
node scripts/check-content-negotiation.mjs --base https://shipyardhq.dev
node scripts/check-content-negotiation.mjs --base http://127.0.0.1:3139
```

The default command exits unsuccessfully for missing Accept variation, a mixed body, wrong content type, or incorrect robots metadata. `--report-only` preserves the failures in JSON while allowing an investigation snapshot to be saved; it must not be used to claim a passing contract.

## Remaining work

- TODO: Identify and inspect the actual production CDN cache rules/custom-key configuration and the owner of final response-header transformations. The repository's Tunnel ingress routes both hosts to the app; it does not establish Cloudflare cache-key or transform rules.
- TODO: Choose a supported fix for the final response layer, or an upstream framework correction, that merges Accept with the existing RSC fields. Do not replace Next's Vary list or patch generated/vendor files as an application fix.
- TODO: Where public caching is enabled, verify the actual cache key distinguishes HTML and Markdown. Otherwise explicitly keep negotiated responses out of shared caching until the contract is corrected.
- TODO: Deploy the selected correction, then rerun the probe through the deployed origin/CDN path and inspect cache-key evidence. Keep the Markdown noindex policy and explicit `.md` URLs intact.

Issue #143 should remain open until those delivery-path requirements are met. This change does not assert an indexing incident or authorize a production configuration change.
