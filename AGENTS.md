# Repository Guidelines

Shipyard HQ is a Next.js App Router app backed by Prisma and Tailwind. Follow the steps below to stay aligned with team workflows.

## Project Structure & Module Organization
- `app/` defines routes, layouts, and API handlers; keep segment folders lowercase and colocate route-specific utilities inside the segment.
- `components/` implements Atomic Design (`atoms/` → `molecules/` → `organisms/` → `pages/` → `layout/`); only import upward in that chain.
- `hooks/`, `lib/`, and `types/` hold reusable logic shared across routes; avoid circular imports by keeping domain logic in `lib/`.
- `prisma/` stores the schema, migrations, and seeds (`seed.ts` plus domain-specific seeds); regenerate clients with `npm run prisma:generate`.
- UI assets live in `public/`; scripts and automation belong in `scripts/`; Cypress specs live in `cypress/`.

## Build, Test, and Development Commands
- `npm run dev` launches the Next.js dev server with hot reload.
- `npm run build` compiles for production; run it before every PR.
- `npm start` serves the built app for smoke checks.
- `npm run lint` and `npm run format` apply ESLint and Prettier (2-space indent, semicolons per config); keep both clean.
- Prisma lifecycle: `npm run prisma:init`, `npm run prisma:deploy`, `npm run prisma:migrate:reset`, `npm run prisma:seed`.
- Testing: `npm run test` (Vitest w/ coverage), `npm run test:watch`, `npm run test:e2e` or `npm run test:e2e:open` (Cypress).

## Coding Style & Naming Conventions
- Use TypeScript with functional React 19 components and Tailwind CSS 4; prefer server components unless you need client-side hooks.
- Name components in PascalCase (`InvoicesPanel.tsx`), hooks/utilities in camelCase, env vars in SCREAMING_SNAKE_CASE.
- Keep route folders lowercase, and apply Tailwind utility-first styling; add semantic helper classes in `lib/` if reused.
- Rely on Prettier (`npm run format`) and respect ESLint autofix suggestions before pushing.

## Testing Guidelines
- Target 100% coverage with Vitest; place specs as `*.test.ts` / `*.test.tsx` alongside the code or in `__tests__/`.
- Mock Clerk, Prisma, and network calls using helpers in `lib/` or `vitest.setup.tsx`.
- Update or add tests with every logic change; run `npm run test` and `npm run lint` locally before requesting review.
- Use Cypress for flows that span multiple routes; keep fixtures in `cypress/fixtures/`.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`); scoped examples: `feat(app/dashboard): add usage graph`.
- PRs must describe scope, link related Linear/Jira issues, and include screenshots or GIFs for UI changes.
- Confirm `npm run lint`, `npm run format`, `npm run build`, and relevant Prisma commands have been executed; note schema impacts and rollback steps.
- Document any new env vars in `README.md` or team docs before merging.

## Security & Configuration Tips
- Required env vars: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DODO_API_KEY`.
- Store secrets in `.env.local`; never commit them. For resets, run `npm run prisma:init` then `npx prisma migrate reset --force`.
- Avoid logging sensitive payloads; scrub identifiers before sending data to third-party services or analytics.
