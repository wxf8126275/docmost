# Task 8 — client-drive-ui-space-scoped (cloud-drive)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 8)
- **Status**: done · evidence: exercised
- **Tests**: 19 passed / 19 total · fixes: 0
- **Date**: 2026-10-19

## What changed

The drive UI is fully space-scoped and gains the Tencent-Weiyun-style category
navigation.

- **`types/drive.types.ts`** — removed `DriveType`; folders/files carry
  `spaceId`; new `DriveCategory` union (`recent | all | images | documents |
  videos | music`).
- **`services/drive-service.ts`** — every endpoint is
  `/spaces/:spaceId/drive/...` (list/create/update/delete folders & files,
  multipart upload with `spaceId`, download URL, quota, share creation).
  Public share links keep `/api/drive/shares/:token`.
- **`queries/drive-query.ts`** — all hooks take `spaceId`; query keys include
  it (`["drive-folders", spaceId, ...]`); mutations carry `spaceId`.
- **`drive-page.tsx`** — resolves `spaceId` from the space slug
  (`useGetSpaceBySlugQuery`); the personal/shared `SegmentedControl` is gone;
  renders a loader until the space resolves.
- **`components/drive-browser.tsx`** — left category nav (icons + labels,
  `aria-label="category-*"`); typed categories filter files by
  extension/MIME (folders hidden); `recent` sorts by last-modified desc;
  delete/rename/share/preview all carry `spaceId`.
- **`upload-dropzone.tsx` / `share-dialog.tsx` / `preview-modal.tsx`** —
  `spaceId` replaces `driveType`.

## Tests (19)

| Suite | # | Focus |
|-------|---|-------|
| `drive-browser.spec.tsx` | 8 | space-scoped CRUD delegation + category nav / filtering / recent sort |
| `upload-dropzone.spec.tsx` | 3 | uploads carry `spaceId` |
| `preview-modal.spec.tsx` | 4 | download URL `/api/spaces/:spaceId/drive/files/:id/download` |
| `share-dialog.spec.tsx` | 4 | share mutation carries `spaceId`; public link contract unchanged |

## Validation

- `vitest run` (whole client): **21 files / 145 tests pass**.
- `tsc --noEmit`: clean.
- eslint: could not run — `@tanstack/eslint-plugin-query` missing in the
  environment (finding **F011**, same root cause as attachment-upload-limit
  F001).

## Files

- Modified: `drive.types.ts`, `drive-service.ts`, `drive-query.ts`,
  `drive-page.tsx`, `drive-browser.tsx`, `upload-dropzone.tsx`,
  `share-dialog.tsx`, `preview-modal.tsx` + the four component specs.
- (Nav-side files are listed under Task 7.)

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
