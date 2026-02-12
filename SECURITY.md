# Security

This repo is a **Next.js + TypeScript** app with **Clerk auth**, **Prisma/Postgres**, and integrations (e.g., analytics, notifications).

## Quick start (local)

### Dependency vulnerabilities (npm)

- Check (read-only):
  ```bash
  npm audit
  ```
- Recommended CI-style check (high+; omit dev-only chain by default to reduce noise):
  ```bash
  npm audit --audit-level=high --omit=dev
  ```

Triage notes:
- Prefer upgrading the vulnerable package (direct dep) or bumping lockfile.
- If the vuln is in a **dev-only** toolchain package, document why it’s acceptable.

### Secret scanning (gitleaks)

Recommended (Docker):
```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source=/repo --no-git --redact
```

Notes:
- CI runs gitleaks on PRs/pushes.
- Suppressions are documented in `.gitleaks.toml`.

### SAST (CodeQL)

CI runs GitHub CodeQL for JavaScript/TypeScript.

- For local exploration, use GitHub’s CodeQL CLI (optional). In most cases, rely on CI results.

## CI security checks

Implemented in `.github/workflows/`:

1) **Dependency review (PR-only)**
- Blocks introduction of new vulnerable dependencies in PRs.

2) **Secret scanning (gitleaks)**
- Scans diffs/commits for hardcoded secrets.

3) **Lightweight SAST (CodeQL)**
- Static analysis for JS/TS security issues.

## Triage policy

### Severity levels
- **P0 (Critical):** auth bypass, RCE, SQL injection, secret leakage with real credentials, payment/webhook forgery, privilege escalation.
- **P1 (High):** stored XSS, IDOR in core flows, SSRF, significant data exposure.
- **P2 (Medium):** reflected XSS with limited impact, missing rate limits, risky misconfig.
- **P3 (Low):** best-practice gaps, low-impact findings, noisy tool warnings.

### Decision rules
- Fix real exploitable issues first; avoid “scan green” at the expense of velocity.
- Any suppression/ignore must be:
  - narrowly scoped,
  - linked to an issue/ticket,
  - include an expiry/review date when possible.

## Threat model / attack surface notes (starter)

### Auth (Clerk)
- Risks: misconfigured middleware, missing auth checks on server actions/routes, role/plan authorization drift.
- Controls: central auth helpers, explicit authorization per route/action, avoid trusting client claims.

### Submissions / directory content
- Risks: stored XSS in submitted content, SSRF via URL fetchers, abuse/spam, file upload risks.
- Controls: output encoding, allowlist URL schemes, rate limiting, moderation workflows.

### Admin
- Risks: privilege escalation, IDOR, insecure admin endpoints.
- Controls: strict role checks, audit logging for admin actions.

### Payments / webhooks
- Risks: forged webhooks, replay attacks, trusting client-side payment state.
- Controls: verify webhook signatures, idempotency keys, server-side source of truth.

## Follow-up findings (initial)

Create/track prioritized findings as issues; include severity, exploit scenario, recommended fix, and validation steps.

Current baseline from `npm audit` (2026-02-12):
- **High:** `hono <=4.11.6` via `prisma -> @prisma/dev -> hono` (toolchain path; confirm runtime exposure).
- **Moderate:** `lodash 4.0.0-4.17.21` via `@mrleebo/prisma-ast -> chevrotain -> lodash` (toolchain path).

Next step: determine whether these are production/runtime reachable; if not, prioritize cleanup but do not block deploys solely on dev-toolchain advisories.
