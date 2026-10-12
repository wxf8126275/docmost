# Plan: Word (DOCX) Import — Enterprise Implementation

Generated: 2026-10-12T00:00:00Z
Requirement: ../requirements/2026-10-12-document-import.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | docx-import-service | — | high | no |
| 2 | wire-and-enable | 1 | low | no |
| 3 | tests-and-build | 1, 2 | medium | no |

## Dependency Graph
Task 1 → Task 2 → Task 3

## Task Details

### Task 1: docx-import-service
- **Creates**:
  - `apps/server/src/ee/document-import/docx-import.service.ts`
  - `apps/server/src/ee/document-import/document-import.module.ts`
- **Modifies**: —
- **Test**: `apps/server/src/ee/document-import/docx-import.service.spec.ts`
- **Acceptance**: `DocxImportService.convertDocxToHtml` delegates to `mammoth`,
  returns HTML, and (via the `convertImage` handler) uploads extracted images to
  storage + inserts an `attachments` row, rewriting `src` to `/api/files/...`;
  on upload failure it falls back to an inline base64 `src`.

### Task 2: wire-and-enable
- **Creates**: —
- **Modifies**:
  - `apps/server/src/ee/ee.module.ts` (import `DocumentImportModule`)
  - `apps/client/src/ee/features.ts` (add `Feature.DOCX_IMPORT` to
    `COMMUNITY_FEATURES`)
  - `apps/server/src/integrations/import/services/import.service.ts`
    (revert the earlier inline mammoth fallback so the EE module is the single
    source of truth for DOCX conversion)
- **Test**: build-only (module wiring + feature flag)
- **Acceptance**: `EeModule` imports `DocumentImportModule`; the Word button is
  enabled in the community build; `processDocx` reaches the EE service.

### Task 3: tests-and-build
- **Modifies**: —
- **Test**: run `docx-import.service.spec.ts` + full server build
- **Acceptance**: unit test passes; `tsc` / `nest build` succeeds; no lint
  regressions.
