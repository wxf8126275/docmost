# Team Development Conventions

> Docmost — pnpm + Nx monorepo. Server: NestJS 11 (Fastify) + Kysely/Postgres. Client: React 19 + Vite.

## Commit Format (Conventional Commits)
```
<type>(<scope>): <description>

[optional body]

[optional footer: refs|breaking|co-authored-by]
```
Types: `feat` `fix` `docs` `refactor` `test` `chore` `perf` `ci` `revert`

Scope examples: `server`, `client`, `editor-ext`, `base-formula`, `ee`, `db`.

## Branch Naming
```
feat/<task-id>-<slug>
fix/<task-id>-<slug>
chore/<task-id>-<slug>
```

## Code Style
- Language: TypeScript (strict). Target ES2021, module commonjs on server, ESM elsewhere.
- Max function length: 40 lines.
- Max file length: 400 lines (excluding tests).
- No `any` / `object` types — use precise types. DB row types come from `src/database/types/db.d.ts` (generated via `kysely-codegen`).
- No silent catch — all errors must be handled explicitly (NestJS exceptions / logged).
- Public functions, services, and controllers must have docstrings/comments explaining WHY, not WHAT.
- Follow existing repo style: Prettier + ESLint (`eslint-config-prettier`, `typescript-eslint`). Run `pnpm --filter server lint` / format before committing.
- DTOs use `class-validator` + `class-transformer`; never trust raw request bodies.
- Authorization uses CASL abilities defined in `apps/server/src/core/`; check abilities in service/controller layer.

## Architecture Layers (server)
- `database/migrations/` — Kysely migrations (`migration:create` / `migration:up`).
- `database/repos/` — data-access repositories (Kysely queries).
- `core/` — business logic: services, controllers, modules, DTOs, abilities.
- `collaboration/` — Hocuspocus websocket server for realtime editing.
- `integrations/` — email, storage (S3), search, AI (LangChain/AI SDK), transactional emails.
- `ws/` — Socket.io gateways.
- `common/` — shared utils, guards, decorators, pipes.

## Architecture Layers (client)
- `features/` — feature modules (pages, components, hooks per domain).
- `components/` — shared UI components.
- `pages/` — route-level pages.
- `lib/` — shared helpers/hooks.
- `ee/` — enterprise-only code (separate license).

## Test Requirements
- Every public function has at least one test.
- Server tests: **Jest** with `*.spec.ts` (unit) and `test/jest-e2e.json` (e2e). Run `pnpm --filter server test`.
- Client tests: Vitest (check `apps/client/package.json` for script). Run via `nx run client:test` if configured.
- Tests verify behavior, not implementation.
- No `assert True`, no empty tests, no TODO tests.
- RED must be observed before GREEN.
- Use `happy-dom` for DOM in server jest config; `@testing-library/react` patterns on client.

## AI Agent Output Contract
When finishing a feature, the agent MUST produce:
1. Code + tests passing locally (verified by re-run).
2. Updated plan/state.
3. Handoff document (what was done, how to continue, known risks).
4. Commit message ready (conventional format).
5. Self-review report (conventions compliance).
