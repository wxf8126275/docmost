# Task 11 — drive-quota-space-scoped (cloud-drive, P2)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 11)
- **Status**: done · evidence: exercised
- **Tests**: 4 passed / 4 total · fixes: 0
- **Date**: 2026-10-19

## What changed

- **`drive-quota.service.ts`** — usage is aggregated **per drive space**:
  `getUsedBytes(spaceId)` → `fileRepo.sumFileSizes({ spaceId })`;
  `getQuotaInfo(spaceId)`; `ensureWithinQuota(spaceId, additionalBytes)`.
  The `QuotaScope` ('personal' | 'shared') type is gone. `DRIVE_STORAGE_QUOTA`
  still governs the ceiling (unset = unbounded).
- **`drive-quota.service.spec.ts`** — rewritten for the spaceId contract.

## Tests (4)

| # | Case | Result |
|---|------|--------|
| 1 | `getUsedBytes` sums by space | PASS |
| 2 | `ensureWithinQuota` rejects over-quota | PASS |
| 3 | `ensureWithinQuota` allows within quota | PASS |
| 4 | allows everything when no quota configured | PASS |

## Notes

- Executed within the combined Task 5+6 step (controller quota endpoints now
  pass `spaceId`).

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
