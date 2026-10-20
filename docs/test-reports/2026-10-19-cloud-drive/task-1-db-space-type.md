# Task 1 — db-space-type (cloud-drive)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 1)
- **Status**: done · evidence: exercised
- **Tests**: 4 passed / 4 total · fixes: 0
- **Date**: 2026-10-19

## What changed

Made a "drive" a first-class Space type instead of a parallel top-level module.

1. **Migration A — `20261019T090000-space-drive-type.ts`**
   - `spaces` gains `type varchar NOT NULL DEFAULT 'page'` (backward compatible: existing page spaces default to `'page'`).
   - `drive_folders`, `drive_files`, `drive_shares`, `drive_file_versions` each gain a nullable `spaceId uuid` FK → `spaces(id) ON DELETE CASCADE`.
   - Legacy `drive_type` / `ownerId` columns are **kept** for now (dropped in Migration B after the refactor + backfill).

2. **Migration B — `20261019T100000-drive-space-id-notnull.ts`** (gated)
   - Drops `drive_type` / `ownerId` from `drive_folders` / `drive_files`; sets `spaceId NOT NULL` on all four drive tables.
   - `down` re-adds the legacy columns (nullable) and drops `spaceId` NOT NULL.
   - **Must run only AFTER** Task 5/6 refactor (code stops referencing `driveType`/`ownerId`) **and** Task 2 backfill (every row has `spaceId`).

3. **`db.d.ts`** — added `Spaces.type` (`Generated<string>`) and `spaceId: string | null` to the four drive interfaces. `driveType`/`ownerId` retained temporarily so the still-present v1 drive code keeps compiling until Task 5.

4. **`config/drive.env.example`** — documents `DRIVE_STORAGE_QUOTA` (per-space quota, parsed by `bytes`).

## Tests (`drive-space-type.spec.ts`, mock-based, no live DB)

| # | Case | Result |
|---|------|--------|
| 1 | A adds `spaces.type` (default `page`) + `spaceId` to all 4 drive tables | PASS |
| 2 | A `down` drops `spaceId` / `type` | PASS |
| 3 | B drops `drive_type`/`ownerId`, sets `spaceId` NOT NULL | PASS |
| 4 | B `down` re-adds legacy columns, drops `spaceId` NOT NULL | PASS |

Run: `pnpm --filter server test drive-space-type`

## Files

- Created: `apps/server/src/database/migrations/20261019T090000-space-drive-type.ts`
- Created: `apps/server/src/database/migrations/20261019T100000-drive-space-id-notnull.ts`
- Created: `apps/server/src/database/migrations/drive-space-type.spec.ts`
- Created: `config/drive.env.example`
- Modified: `apps/server/src/database/types/db.d.ts`

## Deviations / notes

- Plan Task 1 said "remove `driveType`/`ownerId` from types". Deferred to Task 5: removing them now would break the still-present v1 `drive.service.ts` (which inserts `driveType`). Migration B file is created but intentionally gated.
- `spaces.type` is `Generated` because it has a DB default.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
