# Repository Guidelines

## Project Structure & Module Organization
This repository is at the documentation and planning stage. `README.md` is only a project title. The main project brief is `contexte_projet_quincaillerie.md`; it describes the planned quincaillerie management product, business rules, data model, and phased roadmap, but it is ignored by Git through the root `.gitignore`. No application source tree, Prisma schema, migrations, or test directories exist yet.

The planned system is a full JavaScript/TypeScript web application: an Express/Node.js REST API with PostgreSQL and Prisma, followed by a React/Vite/Tailwind web interface. The brief also describes a later React Native/Expo offline client. Treat these as target architecture, not implemented modules.

## Build, Test, and Development Commands
No build, test, lint, format, or development commands are currently defined. There is no package manifest or other build-system configuration in the repository. Add and document commands here when the corresponding project tooling is introduced; do not assume the technologies listed in the brief are installed.

## Coding Style & Naming Conventions
No formatter, linter, type-checker, or agent-specific coding rules are configured. When implementation begins, keep conventions aligned with the selected JavaScript/TypeScript tooling and record enforceable settings here. Preserve the domain vocabulary established in the brief, including MGA currency, 20% TVA, decimal stock quantities, CUMP valuation, and atomic Prisma transactions.

## Testing Guidelines
No test framework or test files are present. The project brief proposes Vitest or Jest with Supertest for the future API and application phases, but these are not yet configured commands.

## Commit & Pull Request Guidelines
The two existing commits use a short subject format, including `Initial commit` and `chore: ignore contexte_projet_quincaillerie.md`. Follow short, imperative-style subjects with a conventional category prefix when appropriate, such as `feat:`, `fix:`, or `chore:`. No pull-request template or review automation is present.
