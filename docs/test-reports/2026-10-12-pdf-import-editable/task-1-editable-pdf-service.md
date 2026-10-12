# Task 1: editable-pdf-service

Status: done
Tests: 2 passed / 2 total (RED → GREEN observed)

## Decision
Per user choice (no ONLYOFFICE available), PDF import must yield an **editable
DocMost page**, accepting that complex layout may be imperfect. This supersedes
the rasterization approach from `pdf-import-layout`.

## Change
Rewrote `apps/server/src/ee/document-import/pdf-import.service.ts`:
- `convertPdfToHtml` now uses `@docmost/pdf-inspector`'s `processPdfWithImages`
  (Markdown + raw image bytes with `pdf-image://N` placeholders), converts the
  Markdown to HTML via `@docmost/editor-ext`'s `markdownToHtml`, and returns it.
  The result → ProseMirror JSON is a normal **editable** page (headings,
  paragraphs, lists, and images as real `image` nodes).
- Extracted images are uploaded to storage
  (`getAttachmentFolderPath(File, workspaceId)/{attachmentId}/pdf-image-N.jpg|png`),
  an `attachments` row is inserted (pageId / spaceId / workspaceId / creatorId),
  and the `pdf-image://N` placeholder is rewritten to `/api/files/{attachmentId}/...`.
- On image-upload failure, falls back to an inline base64 `<img>`.
- Removed the `pdftoppm` rasterization path entirely.

## RED phase
Using a **real** PDF (generated via ghostscript in the test's `beforeAll`) so the
old rasterization-first path actually activates, the first test failed: the
service returned `<div><img src="/api/files/.../page-1.png" ...></div>` with no
editable text — exactly the "all images" problem.

## GREEN phase
`PdfImportService` suite: 2/2 pass (editable text + image extraction to
`/api/files/...`; base64 fallback on upload failure). One test assertion fix
(`image/jpeg` vs `image/png`) was needed.
