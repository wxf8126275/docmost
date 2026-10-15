# Plan: Word Export ZIP Bundle

Generated: 2026-10-15T08:10:00Z
Requirement: ../requirements/2026-10-15-word-export-zip-bundle.md

## Investigation Summary
- `docx-export` endpoint (`apps/server/src/integrations/export/export.controller.ts:120`)
  currently returns a single `.docx` buffer via `ExportService.exportPageToDocx`.
- `ExportService.exportPageToDocx` (`export.service.ts:134`) already resolves image
  buffers and generic attachments (`resolveDocxAttachment`, `getAttachment`), and
  passes them to `pageNodeToDocxBuffer`. Image attachments are embedded as pictures;
  non-image attachments render as a hyperlink using `attachment.url` (online URL).
- The HTML/markdown zip export already implements the exact pattern we need:
  - `zipAttachments(prosemirrorJson, zip, allowedAttachments)` adds attachment
    bytes into a zip folder.
  - `updateAttachmentUrlsToLocalPaths(prosemirrorJson)` rewrites attachment src to
    local relative paths.
  - `resolveAccessibleAttachments(...)` resolves which attachments the user may access.
  - `JSZip` is already a server dependency (`jszip@3.10.1`).
- `ExportDocxPageDto` currently has only `pageId`.

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | server-docx-zip-builder | — | medium | no |
| 2 | server-relative-attachment-links | 1 | medium | no |
| 3 | controller-return-zip | 1,2 | low | no |
| 4 | server-zip-tests | 3 | medium | no |
| 5 | verify-runtime-zip-smoke | 1,2,3 | medium | no |

## Dependency Graph
Task 1 → Task 2 → Task 3 → Task 4
Task 1 → Task 5 (along with 2,3)

## Task Details

### Task 1: server-docx-zip-builder
- **Modifies**: `apps/server/src/integrations/export/export.service.ts`
- **Creates**: (helper logic inside the service)
- **Test**: `apps/server/src/integrations/export/export.service.spec.ts` (extends)
- **Behavior**: Add `exportPageToDocxZip(page, userId)` that:
  1. Generates the `.docx` buffer by calling the existing `exportPageToDocx`-style
     pipeline (reuse the node + `getImageBuffer` + a `getAttachment` whose `url` is
     set to the relative `attachments/<name>` path — see Task 2).
  2. Walks `getProsemirrorContent(page.content)` to collect all media attachment
     references (nodes `attachment`, `pdf`, `video`, `audio`, `image`). Resolve each
     to bytes via `resolveDocxAttachment` (reuse). Skip ones already embedded as
     images (only add non-image files to the bundle folder).
  3. Builds a `JSZip`: `zip.file('document.docx', docxBuffer)` and for each resolved
     non-image attachment `zip.file('attachments/<safeName>', bytes)`.
  4. Returns `zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })`.
- **Acceptance**: zip contains `document.docx` + `attachments/<name>` with real bytes;
  image-only pages still produce a zip with just `document.docx`.

### Task 2: server-relative-attachment-links
- **Modifies**: `apps/server/src/integrations/export/export.service.ts`
- **Test**: covered by Task 4
- **Behavior**: In bundle mode, the `getAttachment` passed to `pageNodeToDocxBuffer`
  overrides `url` to `attachments/<fileName>` (relative) instead of the online URL,
  so the hyperlink resolves to the bundled file when extracted. Reuse the
  `updateAttachmentUrlsToLocalPaths` concept (do not mutate the stored page; only
  the docx hyperlink target).
- **Acceptance**: generated `.docx` non-image hyperlinks point to `attachments/<name>`.

### Task 3: controller-return-zip
- **Modifies**: `apps/server/src/integrations/export/export.controller.ts`,
  `apps/server/src/integrations/export/dto/export-dto.ts`
- **Test**: `apps/server/src/integrations/export/export.controller.spec.ts` (new/extend)
- **Behavior**:
  - Add optional `bundleAttachments?: boolean` to `ExportDocxPageDto` (default `true`).
  - In `exportPageDocx`, when bundling, call `exportPageToDocxZip` and respond with
    `Content-Type: application/zip` and filename `<title>.zip`; when `false`, keep the
    current single `.docx` behavior.
- **Acceptance**: `POST docx-export` returns `application/zip` + `.zip` filename when
  bundling (default).

### Task 4: server-zip-tests
- **Modifies**: `apps/server/src/integrations/export/export.service.spec.ts`
- **Test**: same file
- **Behavior**: Add jest tests (mock ESM docx/editor-ext + mock storageService + spy on
  JSZip) verifying:
  - `exportPageToDocxZip` returns a buffer; unzipping yields `document.docx` and
    `attachments/<name>` with the expected bytes.
  - A page with only an image produces a zip with `document.docx` and no
    `attachments/` entry for the image.
  - `bundleAttachments: false` keeps the single `.docx` response.
- **Acceptance**: meaningful assertions on zip structure + contents.

### Task 5: verify-runtime-zip-smoke
- **Creates**: `apps/server/src/integrations/export/docx-zip-bundle.smoke.ts` (run via tsx)
- **Behavior**: Build a page prosemirror JSON with an image attachment + a pdf
  attachment, run the real `exportPageToDocxZip` (→ real `docx` + `JSZip` + real
  storage mock), write the zip to `/tmp/out.zip`, then open it with JSZip and assert
  `document.docx` exists and `attachments/<pdf>` exists with the real bytes; also
  assert the `.docx` hyperlink target is `attachments/<pdf>`.
- **Acceptance**: real zip generated and verified (runtime, since jest can't load the
  ESM docx path — same constraint as the prior feature).

## Risks / Notes
- docx@9.11.0 upgrade is in place but uncommitted (harmless; tests pass). Keep it.
- The single-`.docx` endpoint behavior is preserved via the `bundleAttachments` flag
  to avoid breaking existing callers.
- `JSZip` import style in the service is `import * as JSZip` — reuse it.
