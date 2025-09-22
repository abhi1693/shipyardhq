# Repository Guidelines

Shipyard HQ uses a Next.js App Router stack with Prisma and Tailwind; follow these notes to stay aligned with the existing patterns.

## Project Structure & Module Organization

- `app/` holds App Router routes, layouts, and API handlers; keep route segment folders lowercase.
- `components/` follows Atomic Design (`atoms/` → `molecules/` → `organisms/` → `pages/` → `layout/`); only import upward in that chain.
- `lib/` stores shared client/server utilities; `types/` carries reusable TypeScript definitions.
- Prisma schema, migrations, and `seed.ts` live in `prisma/`; static assets belong in `public/`.

## Build, Test, and Development Commands

- `npm run dev` starts the local Next.js server with hot reload.
- `npm run build` compiles a production bundle; run before shipping.
- `npm start` serves the compiled app for smoke checks.
- `npm run lint` executes ESLint with the Next.js config; fix all warnings.
- `npm run format` applies the repository Prettier settings.
- Prisma workflows: `npm run prisma:init`, `npm run prisma:deploy`, `npm run prisma:generate`, `npm run prisma:seed`.
- After every big feature update, run `npm run lint`, then `npm run format`, and finally `npm run build`; resolve issues before continuing to ensure a clean state, and only then add or update the required unit tests.

## Coding Style & Naming Conventions

- TypeScript, React 19, and Tailwind CSS 4 are standard; default to functional components.
- Formatting uses Prettier (2-space indent, semicolons per config); run `npm run format` before PRs.
- Name components in PascalCase (`ExampleButton.tsx`), hooks/utilities in camelCase, and env vars in SCREAMING_SNAKE_CASE.

## Testing Guidelines

- No runner yet, but prefer Vitest or Jest when adding tests.
- Place specs as `*.test.ts` / `*.test.tsx` near sources or in `__tests__/`.
- Keep `npm run lint` passing and add targeted unit coverage for reusable logic or critical UI paths.
- Agents must update, add, or delete all unit tests affected by their changes, run the updated suite, and ensure it passes with 100% coverage.

## Commit & Pull Request Guidelines

- Use Conventional Commits (e.g., `feat: add leaderboard page`, `fix: handle auth edge cases`).
- PRs should describe scope, link issues, and include screenshots or GIFs for UI updates.
- Document Prisma migration impacts and note rollback steps when schema changes ship.
- Confirm build, lint, and seed (if touched) before requesting review.

## Security & Configuration Tips

- Required env vars: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DODO_API_KEY`.
- Keep secrets in `.env.local`; never commit them.
- Initialize databases with `npm run prisma:init`, then `npx prisma migrate reset --force` to sync schemas.
