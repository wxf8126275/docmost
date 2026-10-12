# Task 2: wire-and-enable

Status: done
Tests: build-only (no unit tests)

## Changes
- `apps/server/src/ee/ee.module.ts` — imports `DocumentImportModule` so
  `DocxImportService` is resolvable via `moduleRef.get(..., { strict: false })`.
- `apps/client/src/ee/features.ts` — added `Feature.DOCX_IMPORT` to
  `COMMUNITY_FEATURES`, enabling the "Word (DOCX)" button in the community build
  (no enterprise license required, no upgrade tooltip).
- `apps/server/src/integrations/import/services/import.service.ts` — reverted the
  earlier inline mammoth fallback so the EE `DocxImportService` is the single
  source of truth for DOCX conversion.

## Verification
- `tsc --noEmit -p tsconfig.build.json` passes (Task 3).
- Client change is type-safe (`Feature.DOCX_IMPORT` already exists in the enum).
