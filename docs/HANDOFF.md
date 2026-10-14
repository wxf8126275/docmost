# HANDOFF — word-export-error (Plan B: real Word/docx export)

Status: DONE (2026-10-14). Feature `word-export-error` is complete and verified at the service-orchestration level.

## What was built

The user reported `Export failed: Cannot read properties of undefined (reading 'toLowerCase')` when exporting a page to Word. Root cause had two layers:

1. The docx export request hit `POST /api/docx-export`, which **did not exist** in this (community) build → 404. With `responseType: "blob"`, the error interceptor crashed on `error.response.data.message.toLowerCase()` (Blob has no `message`).
2. The user chose **Plan B — actually make Word export work**, so we implemented the missing server route instead of only fixing the crash.

### Changes (files)

**Server**
- `apps/server/src/integrations/export/dto/export-dto.ts` — added `ExportDocxPageDto { pageId }`.
- `apps/server/src/integrations/export/export.service.ts` — added `exportPageToDocx(page, userId?)` and private `resolveDocxImage(src, page)`. Extracts ProseMirror content → turns mentions into links → prepends the page title as H1 → converts to a ProseMirror `Node` → delegates to `pageNodeToDocxBuffer` from `@docmost/editor-ext`. The image resolver looks up the attachment `filePath` in the DB (scoped to `spaceId`) and reads bytes from `StorageService`; returns `undefined` on any failure so the serializer skips the image.
- `apps/server/src/integrations/export/export.controller.ts` — added `POST docx-export`: loads the page (`includeContent`), enforces `validateCanView`, streams the `.docx` buffer with the correct `Content-Type` and a `Content-Disposition` filename (the frontend reads this header to name the download).

**Client**
- `apps/client/src/lib/api-error.ts` — **pre-existing file** that exported `getApiErrorMessage` (used by 7 modules). Appended `isWorkspaceNotFound(error)` (type-safe guard for the 404 "workspace not found" branch). Did NOT replace the file.
- `apps/client/src/lib/api-client.ts` — `case 404` now calls `isWorkspaceNotFound(error)` instead of `error.response.data.message.toLowerCase()` directly. This is the defense-in-depth fix for the originally reported crash on blob 404 bodies.

## Key decision / why

`@docmost/editor-ext` already ships `pageNodeToDocxBuffer` (the same engine upstream docmost EE uses to convert ProseMirror → `.docx`). So "implement docx export" was wiring a route + resolver, not building a converter. The frontend `exportPageToDocx` already existed and only needed the backend route.

## Environment gotchas (important for future work here)

- **ESM-only deps under Jest**: `docx`, `image-dimensions`, `@tiptap/extension-unique-id`, and `@sindresorhus/slugify` are ESM-only (`"type":"module"`, no CJS `require` export) and are NOT in Jest's `transformIgnorePatterns`. Importing them in a CommonJS Jest run fails. The server unit test therefore **mocks** `@docmost/editor-ext`, `collaboration.util`, `prosemirror/utils`, and `@sindresorhus/slugify`. See finding F001 below.
- **Collateral near-miss**: the helper was first written to `apps/client/src/lib/api-error.ts`, which already existed. The first client `tsc` caught the overwrite (`getApiErrorMessage` missing). Restored the original and appended the new export. Lesson: check whether a target file already exists before `write_to_file`.

## Verification

| Check | Result |
|-------|--------|
| Server `tsc --noEmit` | EXIT 0 |
| Client `tsc --noEmit` | EXIT 0 |
| Server Jest `export.service.spec.ts` | 3 passed |
| Client Vitest `api-error.spec.ts` | 4 passed |

Server test cases: (1) title prepended as H1 + buffer returned; (2) image resolver reads bytes from storage; (3) unresolvable image is skipped (resolver returns `undefined`, serializer drops it). Client test cases: blob 404 body no-throw, JSON "workspace not found" → true, other message → false, no response → false.

## Open finding (F001, reliable-delivery, medium)

Because the real docx generation is mocked in the unit test, the actual `.docx` bytes were not produced in the test env. **Recommended runtime smoke test** to fully prove end-to-end export:
```
curl -X POST /api/docx-export -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' -d '{"pageId":"<id>"}' -o out.docx
file out.docx   # expect: Microsoft Word 2007+
```
Or add Jest `transformIgnorePatterns`/`moduleNameMapper` so the ESM libs load and the converter can run in-tests.

## How a future agent should pick this up

- The feature is `DONE`; all 3 tasks are in `state.json` with reports under `docs/test-reports/2026-10-14-word-export-error/`.
- `state.json` and `docs/.sean/history/*` are the source of truth; `docs/requirements/2026-10-14-word-export-error.md` is the requirement.
- If export still fails at runtime, suspect: (a) EE license gating on the client `export-modal` (the Docx option is hidden unless `useHasFeature(DOCX_EXPORT)`), or (b) the docx route not being registered in the running build.
- No git commit was made (git safety). Commit only when the user explicitly requests.
