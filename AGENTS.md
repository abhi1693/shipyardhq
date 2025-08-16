# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js App Router pages, layouts, and API routes.
- `components/`: Atomic Design (`atoms/`, `molecules/`, `organisms/`, `pages/`, `layout/`). Use PascalCase files; import only upward (atoms → molecules → organisms → pages).
- `lib/`: Client/server utilities, helpers, and config.
- `prisma/`: Schema, migrations, and `seed.ts`.
- `public/`: Static assets.
- `types/`: Shared TypeScript types.
- Root: `middleware.ts`, `next.config.ts`.

## Build, Test, and Development Commands

- `npm run dev`: Start the Next.js dev server.
- `npm run build`: Create a production build.
- `npm start`: Serve the compiled app.
- `npm run lint`: Lint with ESLint/Next.
- `npm run format`: Format with Prettier.
- Prisma: `npm run prisma:init` (copy `DATABASE_URL`), `npm run prisma:migrate` (reset/apply dev migrations), `npm run prisma:deploy` (prod), `npm run prisma:generate` (client), `npm run prisma:seed` (seed local).

## Coding Style & Naming Conventions

- Stack: TypeScript, React 19, Next.js App Router, Tailwind CSS 4.
- Formatting: Prettier (2‑space, semicolons per config). Run `npm run format`.
- Linting: ESLint (`eslint.config.mjs`). Fix all warnings before PRs.
- Naming: components `PascalCase.tsx`; hooks/utilities `camelCase.ts`; route segments lowercase; env vars `SCREAMING_SNAKE_CASE`.
- Atomic Design: compose smaller units; promote shared UI downward when duplication appears; never import downward.

## Testing Guidelines

- Runner: none configured yet. Prefer Jest or Vitest when adding tests.
- File patterns: `*.test.ts` / `*.test.tsx` colocated or in `__tests__/`.
- Minimum: keep `npm run lint` passing; add unit tests for library code and critical UI.
- Example (once configured): `npx vitest --coverage` or `npx jest --coverage`.

## Commit & Pull Request Guidelines

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`). Example: `feat: add leaderboard page`.
- PRs: include description, linked issue, screenshots/GIFs for UI, Prisma migration notes, and a checklist of commands run (build, lint, seed if applicable). Keep PRs small and focused; include rollback notes for schema changes.

## Security & Configuration

- Required env vars: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DODO_API_KEY`.
- Do not commit secrets. Use `.env.local` for development. Initialize DB with `npm run prisma:init`, then run `npm run prisma:migrate`.
