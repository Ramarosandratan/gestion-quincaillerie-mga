# Repository Guidelines

## Project Structure & Module Organization
The repository contains the initial TypeScript/Express backend in `src/`, with Prisma configuration in `prisma.config.ts` and the PostgreSQL data model in `prisma/schema.prisma`. `README.md` is only a project title. The project brief is `contexte_projet_quincaillerie.md`; it describes the quincaillerie management product and business rules, but it is ignored by Git through the root `.gitignore`.

The planned system is a full JavaScript/TypeScript web application: an Express/Node.js REST API with PostgreSQL and Prisma, followed by a React/Vite/Tailwind web interface. The brief also describes a later React Native/Expo offline client. Treat these as target architecture, not implemented modules.

## Build, Test, and Development Commands
- `npm run dev` starts the API with `tsx` watch mode.
- `npm run build` compiles `src/` to `dist/` with TypeScript.
- `npm test` runs the Vitest/Supertest integration checks.
- `npm start` runs the compiled API.
- `npx prisma validate` checks the Prisma schema.
- `npx prisma migrate dev --name <name>` creates and applies a migration; it requires a valid local `DATABASE_URL` in `.env`.
- `npx prisma generate` regenerates the Prisma client.

The `GET /health` endpoint returns the API status. No automated test command is configured yet.

## Coding Style & Naming Conventions
TypeScript uses strict mode, ES module interop, Node16 module resolution, and `src`/`dist` boundaries configured in `tsconfig.json`. No formatter, linter, or agent-specific coding rules are configured. Preserve the domain vocabulary established in the brief, including MGA currency, 20% TVA, decimal stock quantities, CUMP valuation, and atomic Prisma transactions.

## Testing Guidelines
No test framework or test files are present. The project brief proposes Vitest or Jest with Supertest for the API, but these are not yet configured commands.

## Commit & Pull Request Guidelines
The two existing commits use a short subject format, including `Initial commit` and `chore: ignore contexte_projet_quincaillerie.md`. Follow short, imperative-style subjects with a conventional category prefix when appropriate, such as `feat:`, `fix:`, or `chore:`. No pull-request template or review automation is present.

Create a dedicated `feature/<short-name>` branch for each new functionality, push that branch to GitHub, and merge it into `main` through the project review workflow.
