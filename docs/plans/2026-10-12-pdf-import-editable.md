# Plan: PDF Import — Editable Rich-Text Page

Generated: 2026-10-12T06:00:00Z
Requirement: ../requirements/2026-10-12-pdf-import-editable.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | editable-pdf-service | — | high | no |
| 2 | tests-and-build | 1 | medium | no |

## Dependency Graph
Task 1 → Task 2

## Task Details

### Task 1: editable-pdf-service
- **Modifies**: `apps/server/src/ee/document-import/pdf-import.service.ts`
- **Test**: `apps/server/src/ee/document-import/pdf-import.service.spec.ts`
- **Acceptance**: Rewrite `convertPdfToHtml` to use `@docmost/pdf-inspector`
  Markdown + image extraction (editable rich text), uploading extracted images to
  storage and rewriting `pdf-image://N` → `/api/files/...`. Remove the
  `pdftoppm` rasterization path. Mockable via the module-level `processPdfWithImages`.

### Task 2: tests-and-build
- **Test**: run `pdf-import.service.spec.ts` + server build + lint
- **Acceptance**: tests pass; `tsc` / build succeeds; no lint regressions.
