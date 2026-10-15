# Docker Deploy Documentation

## Problem
The repo already ships a multi-stage `Dockerfile` and a `docker-compose.yml`
(docmost + Postgres/pgvector + Redis), but there is no self-contained guide for
building and running the application in Docker. In particular:

- The default `docker-compose.yml` pulls the **published** image
  `docmost/docmost:latest`, not a locally built image of *our* code.
- Required environment variables (`APP_SECRET`, `DATABASE_URL`, `REDIS_URL`,
  `APP_URL`) and how to generate a safe `APP_SECRET` are not documented locally.
- Storage persistence (`/app/data/storage` + named volume) and how to inspect
  it on the host is not explained.
- The optional collaboration (realtime) service (`pnpm collab`) is not mentioned.

## Behaviors
- Document how to build a local image from the current source (`docker build`
  and/or Compose `build:`), so our code is deployed — not the published image.
- Document how to run the full stack via `docker compose up`
  (docmost + db + redis).
- Document required environment variables and how to generate a safe
  `APP_SECRET` (`openssl rand -hex 32`).
- Document storage persistence (`/app/data/storage` + named volume) and how to
  bind-mount a host directory for inspection/backup.
- Document verification (health check / logs) and how to update to new code.
- Note the optional collaboration service (`pnpm collab`) and common pitfalls.

## Acceptance Criteria
- Guide is accurate against the actual `Dockerfile`, `docker-compose.yml`, and
  `package.json` — verifiable by manual review (no code/build changes). → manual/demo
- A user following the guide can build and run the stack and reach
  `http://localhost:3000`. → manual/demo

## Context
- Tech stack: Node 26-slim, pnpm 11.28.2, Nx, NestJS/Fastify server, React
  client, Tiptap editor; Postgres (pgvector) + Redis.
- Related features: `word-export-zip-bundle` (adds a `.zip` Word export;
  unrelated to deploy but part of the current code).
- Constraints: `docx` pinned to `9.7.1`; the image build runs
  `pnpm install --frozen-lockfile`, which enforces the supply-chain policy
  (`minimumReleaseAge` in `pnpm-workspace.yaml`). The committed `pnpm-lock.yaml`
  is policy-valid (after the `docx@9.11.0` revert), so the build will pass.
- Non-goals: Do **not** modify `Dockerfile`/`docker-compose.yml`, do **not**
  actually build or run containers, do **not** set up CI.
