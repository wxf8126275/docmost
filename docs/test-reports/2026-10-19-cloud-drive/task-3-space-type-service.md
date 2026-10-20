# Task 3 — space-type-service (cloud-drive)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 3)
- **Status**: done · evidence: exercised
- **Tests**: 6 passed / 6 total · fixes: 0
- **Date**: 2026-10-19

## What changed

Made `type` a first-class, writable space property (`page` default, `drive` new).

- **`apps/server/src/database/types/entity.types.ts`** — added `export type SpaceType = 'page' | 'drive'`.
- **`apps/server/src/core/space/dto/create-space.dto.ts`** — added optional `type?: SpaceType` validated by `@IsIn(['page','drive'])`.
- **`apps/server/src/core/space/services/space.service.ts`**:
  - `create()` now inserts `type: createSpaceDto.type ?? 'page'` (backward compatible — existing callers omit `type`, land as `'page'`).
  - `getWorkspaceSpaces(workspaceId, pagination, type?)` forwards an optional `type` filter to the repo.
- **`apps/server/src/database/repos/space/space.repo.ts`** — `getSpacesInWorkspace(workspaceId, pagination, type?)` adds `where('type','=', type)` when `type` is provided.

## Tests (`space.service.spec.ts`, mocked `SpaceRepo`, no live DB)

| # | Case | Result |
|---|------|--------|
| 1 | service defined | PASS |
| 2 | `create()` with `type:'drive'` persists `type:'drive'` | PASS |
| 3 | `create()` without `type` defaults to `'page'` | PASS |
| 4 | `create()` throws when slug exists | PASS |
| 5 | `getWorkspaceSpaces` forwards `type` filter to repo | PASS |
| 6 | `getWorkspaceSpaces` omits filter when not provided | PASS |

Run: `pnpm --filter server test core/space/services/space.service.spec.ts`

## Files

- Modified: `entity.types.ts`, `create-space.dto.ts`, `space.service.ts`, `space.repo.ts`
- Modified: `space.service.spec.ts`

## Notes

- `Insertable<Spaces>` already treats the `Generated` `type` column as optional, so the insert type-checks.
- No behavior change for existing page spaces; no new endpoint — only the DTO field + filtering hook for later drive tasks.
- Drive-space creation by users (manual, no auto personal drive) is wired through this `type` field in later tasks.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
