# Task 9 — drive-i18n (cloud-drive)

- **Requirement**: `docs/requirements/2026-10-19-cloud-drive.md`
- **Plan**: `docs/plans/2026-10-19-cloud-drive.md` (Task 9)
- **Status**: done · evidence: exercised
- **Tests**: 4 passed / 4 total · fixes: 0
- **Date**: 2026-10-19

## What changed

All drive / space-type user-visible strings now flow through i18next across
all 12 locales.

- **12 × `translation.json`** (en-US, zh-CN, de-DE, es-ES, fr-FR, it-IT, ja-JP,
  ko-KR, nl-NL, pt-BR, ru-RU, uk-UA) — 31 keys each (371 additions total),
  existing translations preserved:
  - shell/folders/files: `Drive`, `New folder`, `Upload`, `Search`,
    `Folder name`, `Create`, `This folder is empty`, `Rename`, `Save`, `Root`
  - Weiyun-style categories: `Recent`, `All`, `Images`, `Documents`,
    `Videos`, `Music`
  - quota: `Storage`, `Unlimited`
  - share dialog: `Share`, `Permission`, `Read`, `Download`, `Expires`,
    `Never`, `1 hour`, `1 day`, `7 days`, `Generate link`, `Copy`
  - upload: `Done`, `Failed`, `Drag files here or click to upload`
  - notifications: 7 × `Failed to …` (create/rename/delete folder/file,
    upload file, create share)
  - space type: `Page`, `Space type`, `Drive spaces store files instead of pages`
- **No hardcoded strings to replace**: a recursive scan of the drive
  components found every user-visible string already routed through `t()`
  (`EXPIRY_OPTIONS` labels are rendered via `t(o.label)`).
- **`features/drive/i18n.spec.tsx`** (new) — guards the contract.

## Tests (4)

| # | Case | Result |
|---|------|--------|
| 1 | all 12 locale files are covered | PASS |
| 2 | every required key present & non-empty in every locale | PASS |
| 3 | en-US uses the canonical labels | PASS |
| 4 | zh-CN fully localized (no raw English keys) | PASS |

## Validation

- Client suite after the change: **22 files / 149 tests pass**; `tsc` clean.

## Artifacts

See `docs/artifacts/2026-10-19-cloud-drive.md`.
