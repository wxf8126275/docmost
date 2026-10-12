# Onboarding — Docmost

AI-readable primer for any agent taking over work in this repo.

## What this is
**Docmost** — open-source collaborative wiki & documentation platform (AGPL-3.0 core; enterprise features under `packages/ee` / `apps/*/src/ee`). Version `0.96.0`. Real-time collaboration via Hocuspocus/Yjs, rich editor via Tiptap.

## Toolchain
- **Package manager**: pnpm `11.28.2` (workspaces: `apps/*`, `packages/*`).
- **Monorepo orchestration**: Nx `23.1.1` (`nx run-many`, `nx run <project>:<target>`).
- **Language**: TypeScript 5.9 (strict).
- **Runtime**: Node (ESM). Server runs on Node; collaboration server runs as separate process.

## Workspace layout
```
apps/
  server/        NestJS 11 (Fastify) backend. src/: core, database, collaboration, integrations, ws, common, ee
  client/        React 19 + Vite frontend. src/: features, components, pages, hooks, lib, ee
packages/
  editor-ext/    Tiptap editor extensions (shared editor logic)
  base-formula/  Formula/spreadsheet engine (server + client entrypoints)
  ee/            Enterprise-only packages
patches/         pnpm patches
docker-compose.yml, Dockerfile   deployment
```

## Server (backend)
- **Framework**: NestJS 11, Fastify platform (`@nestjs/platform-fastify`).
- **Database**: PostgreSQL via **Kysely** (`kysely` + `kysely-postgres-js`).
  - Migrations: `apps/server/src/database/migrations/` (run `pnpm --filter server migration:up`).
  - Repositories: `apps/server/src/database/repos/`.
  - Generated DB types: `apps/server/src/database/types/db.d.ts` (`migration:codegen` via `kysely-codegen`). Do NOT hand-edit.
- **Auth**: JWT + Passport (`@nestjs/jwt`, `passport-jwt`), OAuth2 (`@jmondi/oauth2-server`), SAML/OIDC for enterprise.
- **Authz**: CASL (`@casl/ability`), abilities defined under `core/`.
- **Validation**: `class-validator` / `class-transformer` DTOs.
- **Jobs/queue**: BullMQ (`@nestjs/bullmq`) + Redis.
- **Realtime**: Hocuspocus server in `collaboration/` (`collab:dev` / `collab:prod`); Socket.io in `ws/`.
- **AI**: LangChain (`@langchain/core`) + Vercel AI SDK (`ai`, `@ai-sdk/*`).
- **Search**: Typesense / Turbopuffer.
- **Email**: React Email (`react-email`) templates in `integrations/transactional/emails`.
- **Config**: `@nestjs/config` from `.env` (see `.env.example` if present).
- **Logging**: Pino (`nestjs-pino`).
- **Tests**: Jest. Unit: `*.spec.ts` in `src/`. E2E: `test/**` with `test/jest-e2e.json`.
  - Run: `pnpm --filter server test`; e2e: `pnpm --filter server test:e2e`.
- **Path aliases** (jest `moduleNameMapper`): `@docmost/db`, `@docmost/transactional`, `@docmost/ee`, `src`, `@docmost/base-formula/server|client`.

## Client (frontend)
- **Framework**: React 19 + Vite, TypeScript.
- **Editor**: Tiptap 3 (`@tiptap/*`) with collaboration extensions; shared extensions in `packages/editor-ext`.
- **State/data**: React Query (TanStack) + Zustand likely for local UI state (verify in `lib/`).
- **i18n**: `i18n.ts` (10+ languages, Crowdin).
- **Styling**: CSS modules / plain CSS (`*.css` alongside components). Theme in `theme.ts`.
- **Routing**: `pages/` + `App.tsx` (verify router lib).
- **Tests**: Vitest (verify `apps/client/package.json`; run via Nx).
- **EE code**: `apps/client/src/ee/`.

## Common commands
```bash
pnpm install                       # install deps
pnpm dev                           # client + server dev concurrently
pnpm --filter server start:dev    # server only (watch)
pnpm --filter client dev           # client only
pnpm --filter server migration:up  # apply DB migrations
pnpm --filter server test         # server unit tests
pnpm build                         # nx run-many -t build
```

## Key patterns to respect
- Server logic lives in **services** (`core/**/*.service.ts`); controllers are thin and delegate.
- Data access only through **repos** (`database/repos/`) — do not write raw SQL in services.
- Add a **migration** for any schema change; regenerate DB types after.
- Keep enterprise features isolated under `ee/` and gated by license.
- Reuse existing abilities for authorization rather than inline checks.

## Gotchas
- `db.d.ts` is generated — never edit manually; run `migration:codegen`.
- Collaboration server is a **separate process** (`collab:dev`/`collab:prod`).
- Jest transform ignores most `node_modules` except `nanoid|uuid|image-dimensions|marked|happy-dom`.
- `.env` required for DB/Redis/migration codegen.
