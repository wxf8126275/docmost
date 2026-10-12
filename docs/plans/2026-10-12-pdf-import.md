# Plan: PDF Import — Enterprise Implementation

Generated: 2026-10-12T00:00:00Z
Requirement: ../requirements/2026-10-12-pdf-import.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | pdf-import-service | — | high | no |
| 2 | wire-and-enable | 1 | low | no |
| 3 | tests-and-build | 1, 2 | medium | no |

## Dependency Graph
Task 1 → Task 2 → Task 3

## Task Details

### Task 1: pdf-import-service
- **Creates**: `apps/server/src/ee/document-import/pdf-import.service.ts`
- **Modifies**: `apps/server/src/ee/document-import/document-import.module.ts`
  (add `PdfImportService` to providers/exports)
- **Test**: `apps/server/src/ee/document-import/pdf-import.service.spec.ts`
- **Acceptance**: `PdfImportService.convertPdfToHtml` calls
  `processPdfWithImages`, uploads extracted images to storage + inserts
  `attachments` rows, rewrites `pdf-image://N` to `/api/files/...`, converts the
  Markdown to HTML via `markdownToHtml`, and falls back to base64 on upload
  failure.

### Task 2: wire-and-enable
- **Modifies**:
  - `apps/client/src/ee/features.ts` (add `Feature.PDF_IMPORT` to
    `COMMUNITY_FEATURES`)
- **Test**: build-only
- **Acceptance**: PDF button enabled in community build; `processPdf` reaches the
  EE service via `moduleRef.get`.

### Task 3: tests-and-build
- **Test**: run `pdf-import.service.spec.ts` + server build + lint
- **Acceptance**: unit test passes; `tsc` / `nest build` succeeds; no lint
  regressions.
