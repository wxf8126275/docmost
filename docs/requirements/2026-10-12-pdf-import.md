# PDF Import — Enterprise Implementation

## Problem
The space menu's "Import pages" modal
(`apps/client/src/features/page/components/page-import-modal.tsx`) offers a
**PDF** button, but it is gated by `useHasFeature(Feature.PDF_IMPORT)` and the
backend `ImportService.processPdf` requires an Enterprise Edition module
`ee/document-import/pdf-import.service` that is **not bundled in the community
build**. Uploading a `.pdf` therefore fails with
`PDF import requested but EE module not bundled in this build` / "This feature
requires a valid enterprise license."

The project already ships `@docmost/pdf-inspector` (a native Rust PDF text +
image extractor) as a dependency — the same engine DocMost's enterprise PDF
import uses. We implement the enterprise-grade PDF import (PDF → Markdown via
pdf-inspector, embedded images extracted to storage) and enable it for the
community / self-hosted build so the existing "Import pages" UI works
end-to-end.

## Behaviors
- Implement `PdfImportService.convertPdfToHtml(
    buffer, workspaceId, spaceId, pageId, userId): Promise<string>` in
  `apps/server/src/ee/document-import/pdf-import.service.ts`.
- Use `@docmost/pdf-inspector`'s `processPdfWithImages` to extract
  Markdown (with `![image](pdf-image://N)` placeholders) and the raw image
  bytes for each page.
- Upload every extracted image to storage at
  `getAttachmentFolderPath(File, workspaceId)/{attachmentId}/{name}`, insert an
  `attachments` row (pageId / spaceId / workspaceId / creatorId), and rewrite
  each `pdf-image://N` placeholder to `/api/files/{attachmentId}/{name}`.
- Convert the resulting Markdown to HTML via `@docmost/editor-ext`'s
  `markdownToHtml` (the same converter `ImportService.processMarkdown` uses),
  which `processPdf` then turns into ProseMirror JSON.
- On image-upload failure, fall back to an inline base64 data URI so the image
  still renders (degraded but non-blocking).
- Register `PdfImportService` in `DocumentImportModule` (already imported by
  `EeModule`) so it resolves via `moduleRef.get(PdfImportService, {strict:false})`.
- Enable the feature client-side: add `Feature.PDF_IMPORT` to
  `COMMUNITY_FEATURES`.

## Acceptance Criteria
- `processPdf` no longer throws "EE module not bundled"; a `.pdf` with text and
  images imports into a single page → verifiable by unit test + manual upload.
- Returned HTML contains the document text and images reference
  `/api/files/...` (or a base64 fallback when storage upload fails) → verifiable
  by unit test.
- PDF button enabled in the community build (not `disabled`, no upgrade
  tooltip) → verifiable by build + manual.
- `tsc` / build passes; new unit tests pass → verifiable by test command.

## Context
- Tech stack: NestJS 11 (Fastify) server, React 19 / Mantine client, Kysely +
  Postgres, `@docmost/pdf-inspector` (native Rust, already a dependency),
  `mammoth` (DOCX, already implemented in the sibling `DocxImportService`).
- Related: `apps/server/src/integrations/import/services/import.service.ts`
  (`processPdf` requires `ee/document-import/pdf-import.service`), the image
  upload convention in `apps/server/src/integrations/import/services/import-attachment.service.ts`,
  `apps/server/src/ee/ee.module.ts`, `apps/server/src/ee/document-import/document-import.module.ts`,
  `apps/client/src/ee/features.ts` (`COMMUNITY_FEATURES`).
- Constraints: must not break the OSS build (EE module conditionally loaded);
  reuse the existing frontend UI exactly (no redesign); mirror the DOCX image
  storage convention. The whole PDF becomes one imported page (matching the
  existing `importPage` flow, which creates one page per uploaded file).
- Non-goals: OCR for scanned PDFs (pdf-inspector flags `pagesNeedingOcr` but we
  import the extracted text/markdown as-is; GPU OCR is out of scope), Notion /
  Confluence import.
