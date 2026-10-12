# Handoff: PDF Import — Layout Fidelity Fix

## Status
- Overall: DONE
- Tasks completed: 2 / 2
- Last updated: 2026-10-12T05:00:00Z

## Problem
Imported PDF pages were garbled and did not match the original PDF's layout.
Root cause: the importer used `@docmost/pdf-inspector` **Markdown** extraction,
which flattens the PDF's 2D layout into a single flowing column.

## Fix
`apps/server/src/ee/document-import/pdf-import.service.ts` now **rasterizes each
PDF page to a PNG** with the system `pdftoppm` (poppler-utils) and embeds the
rendered pages as `<img src="/api/files/.../page-N.png">` in document order, so
the imported page reproduces the original visual layout. Upload failures degrade
to inline base64; if `pdftoppm` is missing, it falls back to the previous
Markdown text extraction so the feature still imports *something*.

## File Inventory (verified on disk)
### Modified
- `apps/server/src/ee/document-import/pdf-import.service.ts` — rasterize-first
  PDF import + text fallback.
### Tests
- `apps/server/src/ee/document-import/pdf-import.service.spec.ts` — 3 cases
  (page rasterization → storage, base64 fallback, text fallback).

## Behavior
Uploading a `.pdf` via "Import pages" now:
1. `ImportService.processPdf` → `PdfImportService.convertPdfToHtml`.
2. Each PDF page is rendered to PNG via `pdftoppm`, uploaded to storage + an
   `attachments` row, and embedded as an image in order.
3. The page content is the rendered PDF pages → layout matches the source.

## Current Blocker
None.

## Next Steps
1. Build & restart the server (`pnpm --filter server build` / `start`).
2. Re-import the previously-mislaid PDF to confirm the layout now matches.

## Known Risks / TODOs
- `pdftoppm` (poppler-utils) must be installed on the host (present here:
  `/usr/bin/pdftoppm`, `/usr/bin/pdftocairo`, `/usr/bin/gs`). On hosts without it
  the import silently degrades to text extraction (layout lost) — consider
  documenting the dependency or adding a Dockerfile `apt-get install poppler-utils`.
- Rendered pages are images: PDF text is not selectable/searchable in the
  imported page. A future enhancement could overlay extractable text on the
  rendered images (e.g., via pdf-inspector text + positioning), but that is out
  of scope for this fix.

## How to Resume
```bash
cd /home/wuxiufeng/repos/docmost
sean status pdf-import-layout     # check current state
sean run pdf-import-layout        # re-run full plan if needed
npx jest ee/document-import       # run the tests
```
