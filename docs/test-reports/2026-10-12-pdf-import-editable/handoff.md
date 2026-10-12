# Handoff: PDF Import — Editable Rich-Text Page

## Status
- Overall: DONE
- Tasks completed: 2 / 2
- Last updated: 2026-10-12T07:00:00Z

## Decision
User wants imported PDFs to be **editable online** and has no ONLYOFFICE server,
so the import now produces an editable DocMost page (rich text) via PDF text
extraction, accepting that complex layout (multi-column / table-as-layout) may
not be perfectly preserved. This supersedes the rasterization approach
(`pdf-import-layout`): PDFs are no longer rendered as page images.

## What Changed
`apps/server/src/ee/document-import/pdf-import.service.ts`:
- `convertPdfToHtml` extracts the PDF's Markdown + embedded images with
  `@docmost/pdf-inspector`, converts Markdown→HTML with `@docmost/editor-ext`,
  uploads extracted images to storage (rewriting `pdf-image://N` →
  `/api/files/...`), and returns editable HTML.
- Removed the `pdftoppm` rasterization dependency; `convertPdfToTextHtml` and
  `rasterizePdfPages` are gone.

## File Inventory (verified on disk)
### Modified
- `apps/server/src/ee/document-import/pdf-import.service.ts` — editable
  text-extraction import (no rasterization).
### Tests
- `apps/server/src/ee/document-import/pdf-import.service.spec.ts` — 2 cases
  (editable text + image extraction to storage; base64 fallback on upload fail).

## Behavior
Uploading a `.pdf` via "Import pages" now creates a normal editable page: the
PDF's text becomes headings/paragraphs/lists and embedded images become real
`image` nodes — all editable inline. The whole PDF becomes one page (matching
the `importPage` flow).

## Current Blocker
None.

## Next Steps
1. Build & restart the server (`pnpm --filter server build` / `start`).
2. Re-import a PDF and confirm the content is now editable text (not images).

## Known Risks / TODOs
- Layout fidelity: complex multi-column / table-based layouts are flattened into
  a single reading-order column (intrinsic to Markdown extraction; accepted per
  the decision).
- Scanned/image PDFs: pdf-inspector extracts only embedded text; pages with no
  text layer yield little/no editable content. OCR is out of scope.
- No ONLYOFFICE integration (the user's alternative suggestion) — if a Document
  Server becomes available later, the "edit PDF content" path would be
  PDF→DOCX conversion + ONLYOFFICE editor, a separate larger feature.

## How to Resume
```bash
cd /home/wuxiufeng/repos/docmost
sean status pdf-import-editable   # check current state
sean run pdf-import-editable      # re-run full plan if needed
npx jest ee/document-import       # run the tests
```
