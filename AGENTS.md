# Repository Guidelines

## Quick Orientation
- Need a fast overview of what the app does and key user flows? Read `README.md` first. It explains the product (who it’s for, what you can do, key pages) before technical details.

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and API routes.
- `components/`: Atomic Design UI — `atoms/`, `molecules/`, `organisms/`, `pages/`, `layout/` (PascalCase files). Dependencies flow up only (atoms → molecules → organisms → pages).
- `lib/`: Client/server utilities, helpers, config.
- `prisma/`: Schema, migrations, `seed.ts`.
- `public/`: Static assets.
- `types/`: Shared TypeScript types.
- Root: `middleware.ts`, `next.config.ts`.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js dev server.
- `npm run build`: Production build.
- `npm start`: Run compiled app.
- `npm run lint`: Lint with ESLint/Next.
- `npm run format`: Format with Prettier.
- Prisma: `npm run prisma:init` (copy `DATABASE_URL`), `npm run prisma:migrate` (reset/apply dev migrations), `npm run prisma:deploy` (prod), `npm run prisma:generate` (client), `npm run prisma:seed` (seed local).

## Coding Style & Naming Conventions
- Stack: TypeScript, React 19, Next.js App Router, Tailwind CSS 4.
- Formatting: Prettier (2‑space, semicolons per config). Run `npm run format`.
- Linting: ESLint (`eslint.config.mjs`). Fix warnings before PRs.
- Naming: components `PascalCase.tsx`; hooks/utilities `camelCase.ts`; route segments lowercase; env vars `SCREAMING_SNAKE_CASE`.
- Atomic Design: prefer composing smaller units; if duplication appears, promote UI down the stack (organisms → molecules → atoms). Do not import downward.

## Testing Guidelines
- No runner configured yet. Prefer Jest/Vitest when adding tests.
- File patterns: `*.test.ts` / `*.test.tsx` colocated or in `__tests__/`.
- Minimum: keep `npm run lint` passing; add unit tests for library code and critical UI.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`). Example: `feat: add leaderboard page`.
- PRs must include: clear description, linked issue, screenshots/GIFs for UI, migration notes (Prisma), and checklist of commands run (build, lint, seed if applicable). Keep PRs small and focused; include rollback notes for schema changes.

## Security & Configuration
- Required env vars: `DATABASE_URL`, Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), `DODO_API_KEY`.
- Do not commit secrets. Use `.env.local` for development. Initialize DB with `npm run prisma:init`, then run migrations.
