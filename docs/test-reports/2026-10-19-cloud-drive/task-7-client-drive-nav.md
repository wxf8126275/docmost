# Task 7 — client-drive-nav (cloud-drive)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 7)
- **Status**: done · evidence: exercised
- **Tests**: 5 passed / 5 total · fixes: 0
- **Date**: 2026-10-19

## What changed

The cloud drive is no longer a standalone destination — it is content of a
`type: 'drive'` space.

- **`App.tsx`** — removed the standalone `/drive` route and the `DrivePage`
  lazy import.
- **`pages/space/space-home.tsx`** — branches on `space.type`: drive spaces
  render `<DrivePage />`, page spaces keep the overview + tabs.
- **`components/layouts/global/global-sidebar.tsx`** — removed the standalone
  `Drive` nav item (drive spaces now appear via the spaces list / favorites).
- **`features/space/components/spaces-page/all-spaces-list.tsx`** — drive
  spaces get a cloud type badge (`aria-label="space-type-drive"`) and a
  page/drive type filter (`SegmentedControl`).
- **`features/space/components/create-space-form.tsx`** — new space type
  selector (page / drive, default page), submitted with the create payload;
  users create drive spaces manually (no auto personal drive).
- **`features/space/types/space.types.ts`** — `ISpace.type?: 'page' | 'drive'`.

## Tests (5) — `features/drive/drive-space.spec.tsx`

| # | Case | Result |
|---|------|--------|
| 1 | drive space renders the drive browser (with category nav) | PASS |
| 2 | page space renders the classic overview, not the browser | PASS |
| 3 | sidebar has no `/drive` link (still has `/spaces`) | PASS |
| 4 | space list marks drive spaces with the type badge | PASS |
| 5 | space list filters by page/drive type | PASS |

## Files

- Modified: `App.tsx`, `space-home.tsx`, `global-sidebar.tsx`,
  `all-spaces-list.tsx`, `create-space-form.tsx`, `space.types.ts`.
- Created: `drive-space.spec.tsx`.

## Deviations / notes

- Executed together with Task 8 (client drive UI): the server routes moved to
  `/spaces/:spaceId/drive/*` in the Task 5+6 step, so the client drive feature
  was end-to-end broken until both nav and UI landed.
- i18n keys for the new UI (incl. category labels) are intentionally left to
  Task 9 (12-language pass).

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
