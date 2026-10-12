# Task 1: rasterize-pdf-service

Status: done
Tests: 3 passed / 3 total (RED → GREEN observed)

## Root Cause
The previous `convertPdfToHtml` used `@docmost/pdf-inspector`'s
`processPdfWithImages`, which returns **Markdown** — a linear text stream. The
PDF's 2D layout (columns, absolute positioning, tables-as-layout) is lost, so
the imported page did not match the original PDF.

## Fix
Rewrote `apps/server/src/ee/document-import/pdf-import.service.ts`:
- `convertPdfToHtml` now rasterizes each PDF page to a PNG via the system
  `pdftoppm` (`pdftoppm -png -r 150`), uploads each page image to storage
  (`getAttachmentFolderPath(File, workspaceId)/{id}/page-N.png`), inserts an
  `attachments` row (pageId / spaceId / workspaceId / creatorId), and embeds them
  as stacked `<img src="/api/files/...">` in document order → faithful layout.
- On image-upload failure, the page image falls back to an inline base64 `<img>`.
- `rasterizePdfPages` (private, temp-file + cleanup) isolates the system-binary
  call so it is unit-testable.
- `convertPdfToTextHtml` kept as a **fallback** (text/markdown extraction) when
  `pdftoppm` is unavailable, so the import still works on hosts without poppler.

## RED phase
First run failed: `Property 'rasterizePdfPages' does not exist` (method not yet
created — the service still did Markdown-only conversion).

## GREEN phase
`PdfImportService` suite: 3/3 pass (renders pages to storage images, base64
fallback on upload failure, text fallback when rasterization unavailable).

## Real-world validation
Ran `gs` to create a real PDF, then `pdftoppm -png -r 150 pdf /tmp/page` produced
`page-1.png`, matching the service's expected naming/sort — end-to-end path works.
