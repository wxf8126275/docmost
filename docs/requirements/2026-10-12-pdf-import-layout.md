# PDF Import — Layout Fidelity Fix

## Problem
After importing a PDF via the space menu "Import pages", the resulting page
layout is garbled and does **not** match the original PDF.

## Root Cause
`apps/server/src/ee/document-import/pdf-import.service.ts` converts the PDF with
`@docmost/pdf-inspector`'s `processPdfWithImages`, which returns **Markdown**
(a linear text stream). Markdown has no notion of the PDF's 2D layout — multiple
columns, absolute positioning, tables used for layout, figures, etc. are all
flattened into a single flowing column. That Markdown is then converted to HTML
and into ProseMirror JSON, producing a page that bears no visual resemblance to
the source PDF.

## Behaviors
- Implement faithful PDF→page rendering: rasterize **each PDF page to a PNG**
  using the system `pdftoppm` (poppler-utils), which is present on the host
  (`/usr/bin/pdftoppm`, `/usr/bin/pdftocairo`, `/usr/bin/gs`).
- Upload each rendered page image to storage at
  `getAttachmentFolderPath(File, workspaceId)/{attachmentId}/page-N.png`, insert
  an `attachments` row (pageId / spaceId / workspaceId / creatorId), and embed
  each as `<img src="/api/files/{attachmentId}/page-N.png">` stacked in document
  order. This preserves the exact visual layout of the original PDF.
- On image-upload failure, fall back to an inline base64 `data:image/png`
  source so the page still renders (degraded but non-blocking).
- Keep a **fallback** to text (markdown) extraction when `pdftoppm` is
  unavailable, so the import feature still works on hosts without poppler (the
  previous behavior, now only used as a last resort).

## Acceptance Criteria
- A PDF imported into a page shows the document pages as rendered images, in
  order, matching the original visual layout → verifiable by unit test (mocked
  rasterizer returns N page buffers → N `<img src="/api/files/...">` tags) and
  manual upload.
- Page images are uploaded to storage + `attachments` rows created → verifiable
  by unit test.
- Upload failure degrades to base64 `<img>` → verifiable by unit test.
- `pdftoppm` missing → falls back to text extraction without throwing → verifiable
  by unit test.
- `tsc` / build passes; existing + new tests pass → verifiable.

## Context
- Tech stack: NestJS 11 (Fastify) server, React 19 / Mantine client, Kysely +
  Postgres, `@docmost/pdf-inspector` (native Rust, already a dependency).
- The import pipeline `ImportService.processPdf` → `PdfImportService.convertPdfToHtml`
  expects an HTML string; `processHTML` turns it into ProseMirror JSON via
  `TiptapImage` (so `<img>` survives). The whole PDF becomes one imported page
  (matching the existing `importPage` flow, one page per uploaded file).
- Related: `apps/server/src/ee/document-import/document-import.module.ts`
  (module registration), the sibling `DocxImportService` (same image-to-storage
  convention), `apps/server/src/integrations/import/services/import-attachment.service.ts`.
- Constraints: must not break the OSS build; reuse the existing frontend UI
  exactly; prefer a faithful layout over searchable-but-mislaid-out text.
- Non-goals: selectable/searchable text overlay on rendered pages (a possible
  future enhancement); OCR for scanned PDFs.
