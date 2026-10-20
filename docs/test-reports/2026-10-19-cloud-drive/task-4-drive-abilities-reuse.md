# Task 4 — drive-abilities-reuse (cloud-drive)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 4)
- **Status**: done · evidence: exercised
- **Tests**: 3 passed / 3 total · fixes: 0
- **Date**: 2026-10-19

## What changed

Drive permissions now reuse the **space CASL ability** instead of the standalone
all-or-nothing `DriveAbilityFactory`.

- **`apps/server/src/core/casl/interfaces/space-ability.type.ts`** — `SpaceCaslSubject` gained `Drive = 'drive'`; `ISpaceAbility` union includes `[SpaceCaslAction, SpaceCaslSubject.Drive]`.
- **`apps/server/src/core/casl/abilities/space-ability.factory.ts`**:
  - `buildSpaceAdminAbility` → `can(Manage, Drive)`
  - `buildSpaceWriterAbility` → `can(Manage, Drive)`
  - `buildSpaceReaderAbility` → `can(Read, Drive)`
- **`apps/server/src/core/casl/abilities/space-ability.factory.spec.ts`** (created — did not exist) — 3 cases: READER can Read but not Manage Drive; WRITER/ADMIN can Manage Drive.

## Tests

| # | Case | Result |
|---|------|--------|
| 1 | READER → `can(Read, Drive)`, `cannot(Manage, Drive)` | PASS |
| 2 | WRITER → `can(Manage, Drive)` | PASS |
| 3 | ADMIN → `can(Manage, Drive)` | PASS |

Run: `pnpm --filter server test core/casl/abilities/space-ability.factory.spec.ts`

## Files

- Modified: `space-ability.type.ts`, `space-ability.factory.ts`
- Created: `space-ability.factory.spec.ts`

## Deviations / notes

- **Deletion of `drive-ability.type.ts` / `drive-ability.factory.ts` is DEFERRED to Task 6.** `drive.controller.ts` (and `drive.controller.spec.ts`) still `import` the standalone `DriveAbilityFactory` / `drive-ability.type`. Deleting them now would break the controller's compilation (the route + guard refactor to space-scoped happens in Task 6). Recorded as finding **F010** in `state.json`. The new space `Drive` subject is already the single source of truth for drive permissions going forward.
- No behavior regression: existing page/space abilities unchanged; the pre-existing `drive-ability.factory.spec.ts` still passes.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
