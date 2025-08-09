# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and API routes.
- `components/`: Reusable React components (PascalCase filenames).
- `lib/`: Client/server utilities, helpers, and config.
- `prisma/`: Prisma schema, migrations, and `seed.ts`.
- `public/`: Static assets (images, icons).
- `types/`: Shared TypeScript types.
- `middleware.ts`, `next.config.ts`: Edge middleware and Next.js config.

## Component Architecture (Atomic Design)
- Structure: `components/atoms`, `components/molecules`, `components/organisms`, `components/pages`, `components/layout`.
- Dependencies flow upward only: atoms → molecules → organisms → pages. Do not import downward (e.g., atoms must not import molecules).
- Naming: one component per file, `PascalCase.tsx` (e.g., `atoms/button.tsx`, `molecules/SearchBar.tsx`, `organisms/ProductGrid.tsx`).
- Reuse: prefer composing smaller units over adding props to large organisms. Promote common UI from organisms → molecules → atoms when duplication appears.
- Styles: Tailwind utility classes inline; extract shared class logic to `lib/` helpers when needed.

## Build, Test, and Development Commands
- `npm run dev`: Start the Next.js dev server.
- `npm run build`: Compile production build.
- `npm start`: Run the built app.
- `npm run lint`: Lint using Next/ESLint.
- `npm run format`: Format with Prettier.
- Prisma
  - `npm run prisma:init`: Copy `DATABASE_URL` from `.env.local` to `.env`.
  - `npm run prisma:migrate`: Reset and apply dev migrations.
  - `npm run prisma:deploy`: Apply migrations in prod.
  - `npm run prisma:generate`: Generate Prisma client.
  - `npm run prisma:seed`: Seed local data.

## Coding Style & Naming Conventions
- TypeScript, React 19, Next.js App Router; Tailwind CSS 4.
- Formatting: Prettier (2‑space, semicolons per config). Run `npm run format`.
- Linting: ESLint (`eslint.config.mjs`). Fix issues before PRs.
- Naming: components `PascalCase.tsx`; hooks/utilities `camelCase.ts`; route segments lowercase; ENV vars `SCREAMING_SNAKE_CASE`.

## Testing Guidelines
- There is no test runner configured. When adding tests, prefer Jest/Vitest.
- Suggested patterns: `*.test.ts` and `*.test.tsx` colocated near code or in `__tests__/`.
- Minimum: keep `npm run lint` passing and add unit tests for libs and critical UI.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, etc. Example: `feat: add leaderboard page`.
- PRs must include: clear description, linked issue, screenshots/GIFs for UI, migration notes for Prisma, and checklist of commands run (build, lint, seed if applicable).
- Keep PRs small and focused; include rollback notes for schema changes.

## Security & Configuration
- Required env vars (examples): `DATABASE_URL`, Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), and `DODO_API_KEY`.
- Do not commit secrets; use `.env.local` for development. Initialize DB with `npm run prisma:init` and run migrations.
