# Task 12 — drive-versions-space-scoped (cloud-drive, P2)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 12)
- **Status**: done · evidence: exercised
- **Tests**: 6 passed / 6 total · fixes: 0
- **Date**: 2026-10-19

## What changed

- **`drive-version.service.ts`** — `RecordVersionInput`/`RestoreVersionInput`
  carry `spaceId`; `recordVersion` snapshots the file (validating
  `current.spaceId`) and writes `spaceId` into the version row;
  `restoreVersion` validates `version.spaceId` and updates the live file with
  space scope.
- **`drive-version.service.spec.ts`** — updated for the spaceId contract.

## Tests (6)

| # | Case | Result |
|---|------|--------|
| 1 | snapshots the current file (incl. spaceId) | PASS |
| 2 | rejects a file from another space | PASS |
| 3 | lists versions from the repo | PASS |
| 4 | restores the historical path | PASS |
| 5 | rejects a version from another space | PASS |
| 6 | rejects a version not belonging to the file | PASS |

## Notes

- Executed within the combined Task 5+6 step.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
