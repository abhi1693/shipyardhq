# Release notes

## 1.5.42 — 2026-10-28

- Remove retired Faro browser monitoring and private source-map collection.
- Patch the runtime HTTP client dependency.

## 1.5.41 (prepared, unreleased)

- Refresh runtime and development dependencies and regenerate the npm lockfile. Upgrade the React Hooks lint plugin to 7.1.1. Its stricter effect analysis reports 14 existing prop-reset patterns as warnings; a separate state-flow refactor can promote that feedback to errors without changing pagination or optimistic voting in this dependency release.
- Use Next.js 16.4.2 and React 19.3.1, with Node.js 26.12.1 for container and local validation.
- Keep ESLint 9.39.5 and TypeScript 6.0.3: the latest stable Next.js lint plugins do not yet accept ESLint 10 or TypeScript 7. No peer-dependency checks are bypassed.
- Preserve package.json version 0.0.0; application releases continue to use Git release tags. Prisma stays on stable 7.10.1 because the npm latest tag currently selects an 8.0 release candidate.
- Keep a coherent OpenTelemetry 2.12 / experimental 0.223, API 1.9.1, and auto-instrumentations 0.81.1 set. Faro web tracing 2.13 still uses the SDK 2/API <1.10 line; the new SDK 3/0.300 and auto-instrumentations 0.82 require API 1.10. Strict peer resolution rejects mixing those incompatible generations.

- Apply the reviewed MIT-licensed bounded braces parser/AST patch for CVE-2026-93687 to every transitive consumer, with actual-consumer and malicious-input regression tests; keep the normal audit policy.
- Validate the complete native ARM64 runtime image on PRs using the same strict SBOM, HIGH/CRITICAL and secret scan (including unfixed findings), and smoke gate as releases. Exercise a real production build, compiled assets, native modules, GNU tar, Prisma migrations, and products API authentication/pagination/plan boundaries against an isolated synthetic PostgreSQL fixture.
- Include Prisma's generated client and checksum-verified native CLI engine in the image so runtime generation and migration no longer require an external binary download.
- Track release 1.5.41 in `release.json` while preserving the intentional npm package version 0.0.0. Reject mismatched release versions and disable the manual direct-push publisher; publication must use the gated shared workflow. No schema or migration changes are included relative to production 1.5.40.

This change prepares a patch release only. It does not publish a release, container, database migration, or deployment.
