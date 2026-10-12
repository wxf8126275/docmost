# Task 1: docx-import-service

Status: done
Tests: 3 passed / 3 total (RED → GREEN observed)

## What was built
- `apps/server/src/ee/document-import/docx-import.service.ts` — `DocxImportService.convertDocxToHtml(buffer, workspaceId, spaceId, pageId, userId)`.
  - Delegates DOCX → HTML conversion to `mammoth`.
  - `convertImage` handler extracts each embedded image: uploads to storage at
    `getAttachmentFolderPath(File, workspaceId)/{attachmentId}/{name}`, inserts an
    `attachments` row (pageId / spaceId / workspaceId / creatorId), and rewrites
    `<img src>` to `/api/files/{attachmentId}/{name}`.
  - On image-upload failure, falls back to an inline base64 `src` so the image
    still renders (non-blocking).
- `apps/server/src/ee/document-import/document-import.module.ts` — provides/exports `DocxImportService`.

## RED phase
First run: `Cannot find module './docx-import.service'` (module not yet created).
Path bug (`../../../` → `../../`) and `mammoth.Image.src` typing fixed across 2 fix loops.

## GREEN phase
`DocxImportService` suite: 3/3 pass (convert, image-extract-to-storage, base64 fallback).
