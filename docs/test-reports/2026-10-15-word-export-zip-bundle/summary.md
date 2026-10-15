# Summary — word-export-zip-bundle

## Goal
Make the Word (docx) page export self-contained: instead of a single `.docx`
with online-only hyperlinks, the `docx-export` endpoint now returns a `.zip`
containing `document.docx` plus an `attachments/` folder with every referenced
non-image attachment, so the export works fully offline.

## Why a .zip (not in-document embedding)
`docx@9.7.1` and the latest `9.11.0` have **no native arbitrary-file embedding**
(verified: `OleObject`/`EmbeddedObject`/`embeddings` = 0 matches). True OLE
embedding is fragile/client-dependent, so the chosen route is a zip container.

## Changes
- `apps/server/src/integrations/export/export.service.ts`
  - `exportPageToDocxZip(page, userId)`: new; generates the docx and bundles
    non-image attachments into a zip.
  - `generateDocx(...)`: extracted from `exportPageToDocx`; accepts an
    `attachmentSrcNames` map so attachment hyperlinks point at the relative
    `attachments/<name>` path in bundle mode.
  - `collectBundleAttachments(...)`: walks the page for `attachment`/`pdf`/
    `video`/`audio` nodes, resolves bytes via the existing
    `resolveDocxAttachment`, skips image mime types (already embedded in docx).
  - `safeAttachmentName(...)`: dedupes colliding file names
    (`report.pdf` + `report (1).pdf`).
  - `import JSZip = require('jszip')` — works under both tsc and tsx/esbuild.
- `apps/server/src/integrations/export/export.controller.ts`
  - `docx-export` returns `application/zip` + `<title>.zip` by default;
    `bundleAttachments: false` keeps the single `.docx`.
- `apps/server/src/integrations/export/dto/export-dto.ts`
  - `ExportDocxPageDto.bundleAttachments?: boolean`.
- Tests: `export.service.spec.ts` (+3), `export.controller.spec.ts` (new, +2),
  `docx-zip-bundle.smoke.ts` (runtime).

## Tests
- jest: 15 passed across `src/integrations/export/` (3 suites).
- runtime smoke (`tsx`): real editor-ext + jszip produce a valid zip with
  `document.docx` + `attachments/doc.pdf` (bytes match storage); image not
  duplicated.

## Finding
- **F001 (reliable-delivery, medium)**: the endpoint's default deliverable
  changed from `.docx` to `.zip`. Client download handlers may need updating
  (or pass `bundleAttachments: false`).

## Note
- The `docx` dependency upgrade (9.7.1 → 9.11.0) remains uncommitted; it is
  harmless and all tests pass with it.
