# Task 5 — drive-service-space-scoped (cloud-drive)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 5)
- **Status**: done · evidence: exercised
- **Tests**: 36 passed / 36 total · fixes: 0
- **Date**: 2026-10-19

## What changed

Drive is now fully space-scoped: `spaceId` replaces `driveType`/`ownerId`
everywhere. No personal/shared ownership model remains.

- **`apps/server/src/database/types/db.d.ts`** — removed `driveType`/`ownerId`
  from `DriveFolders`/`DriveFiles`; `spaceId` is now required (`string`) on all
  four drive tables (matches the post-migration-B NOT NULL state).
- **`drive-folder.repo.ts` / `drive-file.repo.ts`** — list/create/update/
  softDelete/findById and `sumFileSizes` all filter or write `spaceId`.
  `updateFolder`/`updateFile`/`softDeleteFolder`/`softDeleteFile` gained a
  required `spaceId` scope; `findById` accepts optional `spaceId`.
- **`drive.service.ts`** — `CreateFolderInput`/`CreateFileInput` take `spaceId`;
  list/rename/move/softDelete/breadcrumb/getFolder/getFile are space-scoped;
  owner-forcing logic removed.
- **`drive-storage.service.ts`** — `generateKey` emits
  `drive/{workspaceId}/{spaceId}/{folderId|root}/{uuid}{ext}`.

## Tests (36)

| Suite | # | Focus |
|-------|---|-------|
| `drive.service.spec.ts` | 16 | spaceId persistence, cross-space isolation, scoped mutations |
| `drive-folder.repo.spec.ts` (new) | 5 | recording-mock: where/values clauses scoped by spaceId |
| `drive-file.repo.spec.ts` (new) | 6 | same + `sumFileSizes({spaceId})` |
| `drive-storage.service.spec.ts` | 9 | space-scoped key, no driveType/ownerId segments |

## Files

- Modified: `db.d.ts`, `drive-folder.repo.ts`, `drive-file.repo.ts`,
  `drive.service.ts`, `drive-storage.service.ts`, and the four specs above.
- Created: `drive-folder.repo.spec.ts`, `drive-file.repo.spec.ts`.

## Deviations / notes

- **`db.d.ts` legacy columns removed now (not left for a later task)**: with the
  code no longer writing `driveType`/`ownerId`, `Insertable` would have rejected
  the inserts. Migration B (`20261019T100000-drive-space-id-notnull.ts`, typed
  against `Kysely<any>`) still compiles and its header was updated GATED →
  ENABLED with the backfill (Task 2) as the documented prerequisite for any DB
  holding v1 rows (production has none).
- Cross-space isolation is enforced at three layers: repo `where spaceId`,
  service threading, and (for files) explicit `file.spaceId` checks in the
  controller — the last one also makes the behavior testable with mocked repos.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
