# Task 13 — client-drive-share-quota (cloud-drive, P2)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 13)
- **Status**: done · evidence: exercised (absorbed by Task 8 + Task 9)
- **Tests**: 4 passed / 4 total (shared spec `share-dialog.spec.tsx`)
- **Date**: 2026-10-19

## What changed

No additional code was required — the task's scope landed with the earlier
steps:

- **space-scoped share dialog + quota indicator** — `share-dialog.tsx`
  (`useCreateShareMutation({ fileId, spaceId, input })` → POST
  `/spaces/:spaceId/drive/files/:fileId/share`) and `quota-indicator.tsx`
  (fed by `useDriveQuotaQuery(spaceId)` → GET `/spaces/:spaceId/drive/quota`)
  were converted in **Task 8**.
- **i18n for both** — `Share`, `Permission`, `Read`, `Download`, `Expires`,
  `Never`, `1 hour/1 day/7 days`, `Generate link`, `Copy`, `Storage`,
  `Unlimited` shipped in all 12 locales in **Task 9**.
- Public share links keep the token-gated `/api/drive/shares/:token`
  contract (served by `DrivePublicShareController`).

## Tests

`share-dialog.spec.tsx` (4 tests: permission/expiry options, link generation
with `spaceId` in the mutation payload, quota used/total, quota unlimited)
— green; these 4 are counted in Task 8's 19 and are not double-counted in
the feature-level `tests_passed`.

## Acceptance

分享与配额在 drive 空间 UI 可用且文案 i18n — met.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md` (artifacts listed under
Tasks 8 and 9).
