# Task 2: wire-and-enable

Status: done
Tests: build-only (no unit tests)

## Changes
- `apps/client/src/ee/features.ts` — added `Feature.PDF_IMPORT` to
  `COMMUNITY_FEATURES`, enabling the "PDF" button in the community build (no
  enterprise license required, no upgrade tooltip).

## Verification
- `tsc --noEmit -p tsconfig.build.json` passes (Task 3).
- `processPdf` already requires `ee/document-import/pdf-import.service`; with
  `PdfImportService` registered in `DocumentImportModule` (imported by
  `EeModule`), `moduleRef.get(PdfImportService, { strict: false })` resolves.
