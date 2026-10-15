# Task 1: server-docx-zip-builder

## Status: DONE
## Evidence: exercised

## What was done
Added `ExportService.exportPageToDocxZip(page, userId)` which:
- Refactored `exportPageToDocx` to delegate to a new private `generateDocx(page, userId, attachmentNames?)`.
- `collectBundleAttachments(prosemirrorJson, page)` walks the page tree for
  `attachment` / `pdf` / `video` / `audio` nodes, resolves each via the existing
  `resolveDocxAttachment` (DB + storage bytes), and skips image mime types
  (those are embedded in the .docx already).
- Builds a `JSZip` with `document.docx` (the generated docx) plus
  `attachments/<safeName>` for each resolved non-image file.
- Returns `zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })`.

Reused existing `JSZip` dependency (already a server dep) and the
`resolveDocxAttachment` / `getProsemirrorContent` helpers — no new libraries.

## Tests (jest, mock ESM + real JSZip)
- `bundles a referenced pdf into the zip ...` — asserts the returned buffer
  unzips to `document.docx` + `attachments/doc.pdf` with the exact stored bytes.
- `does not re-bundle image attachments ...` — asserts `attachments/photo.png`
  is absent (image is embedded in the docx).

## Acceptance check
Verified by the two jest tests above (real JSZip used to validate structure).
