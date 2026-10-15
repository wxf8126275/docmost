# Word Export ZIP Bundle

## Problem
When exporting a page to Word, non-image attachments (PDF, docx, zip, etc.) appear
only as online hyperlinks inside the single `.docx`; the files are not physically
available offline. The user wants the Word export to be self-contained so the
attachments can be opened without network access to the server.

## Behaviors
- The `docx-export` endpoint returns a `.zip` containing `document.docx` plus an
  `attachments/` folder holding every referenced non-image attachment file.
- Non-image attachment hyperlinks inside the `.docx` point to the relative
  `attachments/<filename>` path so they open the bundled local file when extracted.
- Image attachments remain embedded directly inside the `.docx` (already
  implemented by `word-export-attachments`).

## Acceptance Criteria
- `POST docx-export` returns `Content-Type: application/zip` with filename
  `<title>.zip` → verifiable by controller test (content-type + extension) and
  runtime smoke.
- The zip contains `document.docx` and `attachments/<filename>` for each referenced
  non-image attachment, with the same bytes as stored → verifiable by unit test
  (mocked storage) and runtime smoke (real zip opened with JSZip).
- The `.docx`'s non-image attachment hyperlinks use the relative path
  `attachments/<filename>` → verifiable by inspecting the generated docx
  relationships / runtime smoke.
- A page with no non-image attachments (or only images) still exports successfully
  (zip just contains `document.docx`, or behaves gracefully) → verifiable by test.

## Context
- Tech stack: NestJS server, `@docmost/editor-ext` (docx generation), `JSZip`
  (already a server dependency, used by the HTML/markdown zip export).
- Related features: `word-export-attachments` (image embedding — DONE; this feature
  extends it to offline bundling of non-image files).
- Constraints: `docx@9.11.0` has no native arbitrary-file embedding (verified during
  evaluation — `OleObject`/`EmbeddedObject`/`embeddings` = 0 matches). Physical
  embedding therefore uses a zip container, not in-document OLE.
- Non-goals: in-document OLE embedding of files (rejected as fragile / client
  dependent); a single `.docx` with files physically inside the document (not
  possible with the docx library).

## Notes
- Reuse the existing `zipAttachments` / `updateAttachmentUrlsToLocalPaths` helpers
  already used by the HTML/markdown zip export for collecting and localizing
  attachment references.
- The docx is generated with a `getAttachment` resolver that returns a relative
  `url` (`attachments/<name>`) in bundle mode instead of the online URL.
