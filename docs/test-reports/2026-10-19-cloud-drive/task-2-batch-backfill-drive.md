# Task 2 — batch-backfill-drive (cloud-drive)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 2)
- **Status**: done · evidence: exercised
- **Tests**: 5 passed / 5 total · fixes: 0
- **Date**: 2026-10-19

## What changed

Idempotent safety-net batch that folds v1 top-level drive data (keyed by the old
`driveType` + `ownerId` model) into `type = 'drive'` spaces.

- **`apps/server/src/database/backfill/drive-to-spaces.ts`** — core logic:
  - `groupDriveUnits(rows)` groups v1 `drive_folders`/`drive_files` (still carrying `driveType`/`ownerId`) into units keyed by `(driveType, workspaceId, ownerId|shared)`.
  - `deterministicUuid(key)` — stable per key → same space id across reruns.
  - `buildSpaceRow` / `buildOperations` — personal → **private** `type:'drive'` space owned by the user with an **admin** member; shared → **workspace**-visible drive space with **reader** members (resolved from the workspace root space).
  - `applyBackfill(db, {dryRun, verify})` — upserts spaces + members (`ON CONFLICT DO NOTHING`) and backfills `spaceId` on `drive_folders`, `drive_files`, `drive_shares`, `drive_file_versions` (latter two via join to `drive_files`).
- **`apps/server/src/database/backfill/drive-to-spaces.spec.ts`** — 5 unit tests on the pure planning logic (grouping, deterministic id, personal/shared mapping, idempotency).
- **`scripts/backfill-drive-to-spaces.ts`** — CLI runner reusing `migrate.ts`'s DB wiring; supports `--dry-run` and `--verify`.

## Tests

| # | Case | Result |
|---|------|--------|
| 1 | `deterministicUuid` stable, distinct, valid uuid | PASS |
| 2 | groups personal + shared rows into units | PASS |
| 3 | personal → private drive space, owner admin | PASS |
| 4 | shared → workspace drive space, reader members | PASS |
| 5 | same unit key → same space id (idempotent) | PASS |

Run: `pnpm --filter server test database/backfill/drive-to-spaces`

## Files

- Created: `apps/server/src/database/backfill/drive-to-spaces.ts`
- Created: `apps/server/src/database/backfill/drive-to-spaces.spec.ts`
- Created: `scripts/backfill-drive-to-spaces.ts`

## Deviations / notes

- Plan listed the script + spec under `scripts/`. For Jest coverage the logic + spec live under `apps/server/src/database/backfill/`; `scripts/` holds only the thin CLI runner. Recorded in state artifacts.
- **No production v1 data** (confirmed), so this script is a safety net and need not run. DB-execution path is validated by compile + the `--dry-run` mode, not a live DB (none available).
- Shared-drive member resolution picks the workspace's earliest non-personal space as the "root" and copies its members as `reader`. Defensive: skips if no root space.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
