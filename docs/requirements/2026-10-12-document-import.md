# Word (DOCX) Import — Enterprise Implementation

## Problem
The space menu's "Import pages" modal
(`apps/client/src/features/page/components/page-import-modal.tsx`) already offers
a **Word (DOCX)** button, but it is gated by
`useHasFeature(Feature.DOCX_IMPORT)` and the backend
`ImportService.processDocx` requires an Enterprise Edition module
`ee/document-import/docx-import.service` that is **not bundled in the community
build**. Uploading a `.docx` therefore fails with
`DOCX import requested but EE module not bundled in this build` / "This feature
requires a valid enterprise license."

We need to implement the enterprise-grade DOCX import (DOCX → HTML via `mammoth`,
with embedded images extracted to storage) and enable it for the community /
self-hosted build so the **existing frontend UI works end-to-end** without a
license key.

## Behaviors
- Implement `DocxImportService.convertDocxToHtml(
    buffer, workspaceId, spaceId, pageId, userId): Promise<string>` in a new
  `apps/server/src/ee/document-import/` module.
- Convert DOCX → HTML with `mammoth`, preserving headings, lists, tables,
  bold/italic, links, and inline code.
- Extract every embedded image: upload it to storage at
  `getAttachmentFolderPath(File, workspaceId)/{attachmentId}/{name}`, insert an
  `attachments` row (pageId / spaceId / workspaceId / creatorId), and rewrite
  `<img src>` to `/api/files/{attachmentId}/{name}`.
- On image-upload failure, fall back to an inline base64 data URI so the image
  still renders (degraded but non-blocking).
- Wire `DocumentImportModule` into `EeModule` so the service is resolvable via
  `moduleRef.get(DocxImportModule.DocxImportService, { strict: false })`.
- Enable the feature on the frontend: add `Feature.DOCX_IMPORT` to
  `COMMUNITY_FEATURES` (in `apps/client/src/ee/features.ts`) so the Word button
  is usable without an enterprise license.

## Acceptance Criteria
- `processDocx` no longer throws "EE module not bundled"; a `.docx` with text and
  images imports successfully → verifiable by unit test + manual upload.
- Returned HTML contains converted content and images reference `/api/files/...`
  (or a base64 fallback when storage upload fails) → verifiable by unit test.
- `EeModule` imports `DocumentImportModule`; `tsc` / build passes → verifiable by
  build.
- Word button is enabled in the community build (not `disabled`, no upgrade
  tooltip) → verifiable by build + manual.

## Context
- Tech stack: NestJS 11 (Fastify) server, React 19 / Mantine client, Kysely +
  Postgres; `mammoth` (already a dependency) for DOCX → HTML.
- Related: `apps/server/src/integrations/import/services/import.service.ts`
  (calls the EE module via `require`),
  `apps/client/src/features/page/components/page-import-modal.tsx`,
  `apps/client/src/ee/features.ts` (`COMMUNITY_FEATURES`),
  `apps/server/src/ee/ee.module.ts`, and the image-storage convention in
  `apps/server/src/integrations/import/services/import-attachment.service.ts`
  (`getAttachmentFolderPath`, `/api/files/...`, `attachments` row).
- Constraints: must not break the OSS build (EE module is conditionally loaded
  via `AppModule`); reuse the existing frontend UI exactly (no redesign); mirror
  the existing attachment upload convention.
- Non-goals: PDF import, DOCX **export**, Notion / Confluence import. PDF import
  still requires a separate EE module and is out of scope for this pass.
