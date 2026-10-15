# Handoff — word-export-zip-bundle

## What changed and why
The Word export now ships as a self-contained `.zip`. This resolves the
complaint that "attachments are only online URLs and not embedded": non-image
files (PDF/docx/zip/…) are physically bundled alongside the document, and the
`.docx` hyperlinks point at the relative `attachments/<name>` path.

Route decision: docx has no native file embedding (9.7.1 / 9.11.0 verified),
so we use a zip container rather than fragile OLE embedding.

## Files to review
- `apps/server/src/integrations/export/export.service.ts` — `exportPageToDocxZip`,
  `generateDocx`, `collectBundleAttachments`, `safeAttachmentName`.
- `apps/server/src/integrations/export/export.controller.ts` — default zip response.
- `apps/server/src/integrations/export/dto/export-dto.ts` — `bundleAttachments`.
- `apps/server/src/integrations/export/export.{service,controller}.spec.ts`,
  `docx-zip-bundle.smoke.ts`.

## How to verify
- Unit: `cd apps/server && npx jest src/integrations/export/` (15 passed).
- Runtime: `npx tsx --tsconfig apps/server/tsconfig.json \
  apps/server/src/integrations/export/docx-zip-bundle.smoke.ts`
  → writes `/tmp/word-export-zip-bundle-smoke.zip`, prints `SMOKE_OK`.
- Manual: call `POST docx-export` on a page with attachments; confirm a `.zip`
  downloaded containing `document.docx` and an `attachments/` folder.

## Open items
- **F001**: frontend `docx-export` caller may need to handle the `.zip`
  (unpack or set `bundleAttachments: false`).
- `docx` 9.11.0 upgrade is uncommitted — commit alongside this work.

## Commit suggestion (not yet committed)
```
feat(export): return a self-contained .zip for Word export

- docx-export now bundles referenced non-image attachments into
  attachments/ inside a .zip (document.docx + files)
- non-image hyperlinks point at the relative attachments/<name> path
- add bundleAttachments flag to keep the single .docx behavior

Tests: jest 15 passed; runtime zip smoke verified
```
