# Clerk resource authentication

Member pages now call `auth.protect()` at their entry points. The member and
onboarding layouts retain their active-account and onboarding checks, and the
onboarding form has a protected server page around its client component.
Product pages retain `requireManageableProduct` for ownership checks.

`proxy.ts` keeps `clerkMiddleware()`, the existing matcher, cache headers, and
public-route handling. It no longer uses `createRouteMatcher` or enforces member
authentication through path matching. This follows [Clerk's migration guide](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher).

Server Actions must authenticate independently of their calling page. Both
`getProductById` and `getProductForEditWizard` authenticate the caller, require an
active local account, and scope the product query to that account's ID. Existing
mutation actions and private API routes retain their session, active-account,
and ownership checks. Webhooks and worker endpoints retain signature or token
verification. Public discovery reads remain public.

Internal helpers now live under `lib/server`, without `use server` directives:

- User synchronization accepts only trusted, server-fetched Clerk records and is
  marked `server-only`; it is no longer a remotely callable upsert action.
- Catalog queries accepting Prisma arguments are also marked `server-only`.
- Homepage queries and cache invalidation are shared by routes and workers. They
  are ordinary server helpers, not public actions accepting a caller-supplied
  Clerk ID or exposing cache mutations. Client imports from this module are
  type-only. A `server-only` import is intentionally omitted for compatibility
  with the standalone worker; its API callers retain their access checks.

Verify signed-out member navigation, API rejection, direct product-action denial,
suspended accounts, and cross-owner access. The product-read unit tests exercise
resource checks without a layout or middleware gate. A production build should
also exclude the internal helpers from the Server Action manifest.

No dependency updates, database changes, or migrations are required.

Local validation passed: all 13 member page routes redirected unauthenticated
RSC requests to sign-in, upload and autofill APIs returned 401, and anonymous
homepage vote requests returned no private votes. The generated action manifest
contains none of the internal helpers listed above. Eight product-read tests
cover signed-out callers, inactive accounts, other owners, and the correct owner.
No authenticated browser session was used.
