# Repository Guidelines

Shipyard HQ runs on Next.js App Router with Prisma and Tailwind. Use this guide to stay aligned with house standards.

## Project Structure & Module Organization

- `app/` hosts routes, layouts, and API handlers; keep segment folders lowercase and colocate route helpers inside the segment.
- `components/` follows Atomic Design (`atoms/` → `molecules` → `organisms` → `pages` → `layout`); only import upward.
- Shared logic lives in `hooks/`, `lib/`, and `types/`; keep data access in `lib/` to avoid circular imports.
- Prisma schema, migrations, and seeds sit in `prisma/`; regenerate clients with `npm run prisma:generate`.
- Static assets belong in `public/`; automation scripts in `scripts/`; Cypress specs and fixtures live in `cypress/`.

## Build, Test, and Development Commands

- `npm run dev` starts the Next.js dev server with hot reload.
- `npm run build` compiles production bundles; run before every PR.
- `npm start` serves the built app for smoke checks.
- `npm run lint` and `npm run format` enforce ESLint and Prettier (2-space indent, semicolons per config).
- Prisma lifecycle: `npm run prisma:init`, `npm run prisma:deploy`, `npm run prisma:migrate:reset`, `npm run prisma:seed`.
- Testing: `npm run test` (Vitest with coverage), `npm run test:e2e` or `npm run test:e2e:open` (Cypress GUI).

## Coding Style & Naming Conventions

- Default to TypeScript functional React 19 components and Tailwind CSS 4; prefer server components unless client hooks are required.
- Name components in PascalCase (`InvoicesPanel.tsx`), hooks/utilities in camelCase, env vars in SCREAMING_SNAKE_CASE.
- Keep route folders lowercase, favor Tailwind utility classes, and rely on Prettier plus ESLint autofix before pushing.

## Testing Guidelines

- Maintain 100% coverage with Vitest; place specs as `*.test.ts` / `*.test.tsx` beside the source or in `__tests__/`.
- Mock Clerk, Prisma, and HTTP calls via helpers in `vitest.setup.tsx` or `lib/`.
- Run `npm run test` and `npm run lint` before review; cover multi-route flows with Cypress and store fixtures in `cypress/fixtures/`.

## Commit & Pull Request Guidelines

- Use Conventional Commits (`feat:`, `fix:`, `chore:`) with scoped messages, e.g. `feat(app/dashboard): add usage graph`.
- PRs must describe scope, link work items, and include screenshots or GIFs whenever UI changes.
- Verify `npm run lint`, `npm run format`, `npm run build`, and any Prisma commands touched; document schema impacts and rollback steps.

## Security & Configuration Tips

- Required env vars: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DODO_API_KEY`; store them in `.env.local` only.
- For reset flows run `npm run prisma:init` then `npx prisma migrate reset --force`; avoid logging sensitive payloads to third-party services.
