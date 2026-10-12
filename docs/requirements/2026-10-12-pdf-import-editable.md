# PDF Import — Editable Rich-Text Page

## Decision
Per user choice (no ONLYOFFICE available), PDF import should produce an
**editable DocMost page** (rich text), not a set of rendered page images. The
user accepts that complex PDF layout (multi-column / table-as-layout) may not be
perfectly preserved — editability of the text is the priority. This supersedes
the rasterization approach from `pdf-import-layout`.

## Problem
The current `PdfImportService` rasterizes each PDF page to a PNG and embeds the
images. Those images are not editable as text. The user wants to edit the
imported PDF content online.

## Behaviors
- `convertPdfToHtml` extracts the PDF's text + images via
  `@docmost/pdf-inspector`'s `processPdfWithImages` (Markdown + raw image bytes
  with `pdf-image://N` placeholders), converts the Markdown to HTML with
  `@docmost/editor-ext`'s `markdownToHtml`, and returns it. The resulting HTML →
  ProseMirror JSON is a normal **editable** page (headings, paragraphs, lists,
  and images as real `image` nodes).
- Extracted images are uploaded to storage at
  `getAttachmentFolderPath(File, workspaceId)/{attachmentId}/{name}`, an
  `attachments` row is inserted (pageId / spaceId / workspaceId / creatorId), and
  the `pdf-image://N` placeholder is rewritten to `/api/files/{attachmentId}/{name}`.
- On image-upload failure, the image falls back to an inline base64 `src`.
- No `pdftoppm` / rasterization dependency is used.

## Acceptance Criteria
- A PDF import yields an editable page whose HTML contains the extracted text
  (headings/paragraphs) → verifiable by unit test (mocked `processPdfWithImages`
  returns markdown; HTML contains the text; no `page-N.png` rasterized images).
- PDF-embedded images are uploaded to storage + `attachments` rows → verifiable.
- Upload failure degrades to base64 `<img>` → verifiable.
- `tsc` / build passes; tests pass → verifiable.

## Context
- Stack: NestJS 11 (Fastify) server, React 19 / Mantine client, Kysely + Postgres,
  `@docmost/pdf-inspector` (native Rust dependency, already present).
- Pipeline: `ImportService.processPdf` → `PdfImportService.convertPdfToHtml`
  (expects an HTML string) → `processHTML` → `htmlToJson` (ProseMirror, with
  `TiptapImage` so `<img>` survives). The whole PDF becomes one imported page.
- Related: `apps/server/src/ee/document-import/document-import.module.ts`,
  `apps/server/src/integrations/import/services/import-attachment.service.ts`,
  `apps/client/src/ee/features.ts` (PDF_IMPORT already in COMMUNITY_FEATURES).
- Constraints: reuse the existing frontend UI exactly; no new npm deps; the
  community build must keep working without an enterprise license.
- Non-goals: pixel-perfect layout fidelity (explicitly traded off for editability);
  ONLYOFFICE / external PDF editor integration; OCR for scanned PDFs (text that
  pdf-inspector extracts is used as-is).
