# Testing

Goal: a **minimal, reliable** testing baseline so refactors/perf work don’t regress behavior.

## Test stack

- **Unit + component tests:** Vitest + Testing Library (jsdom)
- **Smoke coverage (initial):** lightweight “does the core code behave correctly” tests focused on pure libs/utilities used in core flows.

(Playwright/browser e2e can be added later once we have stable seeded data + auth strategy in CI.)

## Run locally

Install deps:

```bash
npm ci
```

Run once:

```bash
npm run test:ci
```

Watch mode:

```bash
npm run test:watch
```

## CI

GitHub Actions runs tests on:

- `pull_request`
- `push` to `master`

CI uses:

- `npm ci --ignore-scripts` (avoids Prisma `postinstall` DB requirement)

## Adding tests (guidelines)

- Prefer deterministic tests with **no network** and **no DB**.
- Favor testing pure functions (normalization, routing helpers, validation) and key components with minimal mocking.
- If a test requires app secrets/DB, it should be explicitly marked and run in a dedicated workflow.
