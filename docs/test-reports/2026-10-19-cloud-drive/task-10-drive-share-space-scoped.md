# Task 10 — drive-share-space-scoped (cloud-drive, P2)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 10)
- **Status**: done · evidence: exercised
- **Tests**: 7 passed / 7 total · fixes: 0
- **Date**: 2026-10-19

## What changed

- **`drive-share.service.ts`** — `CreateFileShareInput` carries `spaceId`;
  `createFileShare` resolves the file via `getFile(fileId, spaceId)` and rejects
  cross-space files (NotFound); the insertable share row now writes `spaceId`.
  The old personal-owner check is gone — membership + `Manage Drive` ability at
  the controller is the authorization boundary.
  `resolveShare` additionally verifies `file.spaceId === share.spaceId`.
- **`drive-share.service.spec.ts`** — rewritten for the space-scoped contract.

## Tests (7)

| # | Case | Result |
|---|------|--------|
| 1 | creates a share scoped to the file space (token/spaceId in row) | PASS |
| 2 | rejects a file from another space | PASS |
| 3 | rejects a file from another workspace | PASS |
| 4 | resolves a valid token | PASS |
| 5 | rejects a share whose file moved spaces | PASS |
| 6 | rejects an expired share | PASS |
| 7 | rejects an unknown token | PASS |

## Notes

- Executed as part of the combined Task 5+6 step: the controller refactor made
  `file.driveType` unavailable, so the share service had to move to `spaceId`
  in the same change to keep the build green.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
