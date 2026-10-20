# Task 6 — drive-controller-space-scoped (cloud-drive)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 6)
- **Status**: done · evidence: exercised
- **Tests**: 23 passed / 23 total · fixes: 0
- **Date**: 2026-10-19

## What changed

All authenticated drive endpoints moved to `spaces/:spaceId/drive/*` and
authorization now reuses the space CASL ability.

- **`drive.controller.ts`** — `@Controller('spaces/:spaceId/drive')`; every
  handler resolves `spaceId` from the route and calls
  `assertDriveAccess(user, workspaceId, spaceId, 'read' | 'manage')`:
  - space must exist and `type === 'drive'`;
  - `SpaceAbilityFactory.createForUser` must yield the required ability
    (reader → `Read Drive`, writer/admin → `Manage Drive`);
  - non-drive space / unknown space / non-member / insufficient role → **403**
    (space existence not leaked).
  Share/quota/version endpoints migrated with it.
- **`drive-public-share.controller.ts`** (new) — the two **public** share routes
  (`GET drive/shares/:token`, `GET drive/shares/:token/download`) live in their
  own `@Controller('drive')`: they are token-gated and space-agnostic, so they
  stay outside the space scope (preserving the v1 public URL contract).
- **`drive.dto.ts`** — removed `driveType` from `CreateFolderDto`,
  `UpdateFolderDto`, `UpdateFileDto`.
- **`drive.module.ts`** — removed `DriveAbilityFactory` provider; registers both
  controllers. `SpaceAbilityFactory`/`SpaceRepo` resolve from the global
  `CaslModule`/`DatabaseModule`.
- **Deleted** (resolves finding **F010**): `drive-ability.type.ts`,
  `drive-ability.factory.ts`, `drive-ability.factory.spec.ts`.

## Tests (23) — `drive.controller.spec.ts`

- Guard: non-drive space 403, unknown space 403, non-member 403, ability denied 403.
- Folders/files CRUD delegates space-scoped; upload uses space key + space quota.
- Quota aggregates by space; share/versions resolve files within the space.
- Public controller: token resolve, download permission gate.
- Module wiring: both controllers registered, `DriveAbilityFactory` absent.

## Files

- Modified: `drive.controller.ts`, `drive.module.ts`, `drive.dto.ts`, `drive.controller.spec.ts`.
- Created: `drive-public-share.controller.ts`.
- Deleted: `drive-ability.type.ts`, `drive-ability.factory.ts`, `drive-ability.factory.spec.ts`.

## Deviations / notes

- **Public share routes split into a second controller** (plan said "分享端点
  一并迁移"): the token resolver cannot require a `spaceId` path segment — the
  token is the capability. Keeping `/drive/shares/:token` also preserves
  compatibility with existing v1 share links.
- Tasks 10/11/12 server-side service refactors were absorbed into this step
  (the controller cannot compile otherwise); their specs are counted under
  those tasks.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
