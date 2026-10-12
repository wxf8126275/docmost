# Task 1: pdf-import-service

Status: done
Tests: 3 passed / 3 total (RED → GREEN observed)

## What was built
- `apps/server/src/ee/document-import/pdf-import.service.ts` — `PdfImportService.convertPdfToHtml(buffer, workspaceId, spaceId, pageId, userId)`.
  - Uses `@docmost/pdf-inspector`'s `processPdfWithImages` to extract Markdown
    (with `![image](pdf-image://N)` placeholders) + raw image bytes per page.
  - Uploads each image to storage at
    `getAttachmentFolderPath(File, workspaceId)/{attachmentId}/{name}`, inserts
    an `attachments` row (pageId / spaceId / workspaceId / creatorId), and rewrites
    `pdf-image://N` to `/api/files/{attachmentId}/{name}`.
  - Converts the resulting Markdown to HTML via `@docmost/editor-ext`'s
    `markdownToHtml` (same converter `ImportService.processMarkdown` uses).
  - On image-upload failure, falls back to an inline base64 `src`.
- `apps/server/src/ee/document-import/document-import.module.ts` — added
  `PdfImportService` to providers/exports (resolves via `moduleRef.get`).

## RED phase
First run: `Cannot find module './pdf-import.service'` (module not yet created).

## GREEN phase
`PdfImportService` suite: 3/3 pass (markdown→HTML, image-extract-to-storage +
placeholder rewrite, base64 fallback).
