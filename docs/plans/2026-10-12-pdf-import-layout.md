# Plan: PDF Import — Layout Fidelity Fix

Generated: 2026-10-12T04:00:00Z
Requirement: ../requirements/2026-10-12-pdf-import-layout.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | rasterize-pdf-service | — | high | no |
| 2 | tests-and-build | 1 | medium | no |

## Dependency Graph
Task 1 → Task 2

## Task Details

### Task 1: rasterize-pdf-service
- **Modifies**: `apps/server/src/ee/document-import/pdf-import.service.ts`
- **Test**: `apps/server/src/ee/document-import/pdf-import.service.spec.ts`
- **Acceptance**: Rewrite `convertPdfToHtml` to rasterize each PDF page to a PNG
  via `pdftoppm`, upload to storage + insert `attachments` rows, embed as
  stacked `<img src="/api/files/...">` (layout-faithful). Keep text extraction as
  a fallback when rasterization fails. `rasterizePdfPages` is a separate method so
  it is unit-testable without the system binary.

### Task 2: tests-and-build
- **Test**: run `pdf-import.service.spec.ts` + server build + lint
- **Acceptance**: tests pass; `tsc` / build succeeds; no lint regressions.
