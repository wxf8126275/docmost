# Test Report — Task 3: verify

- Status: PASS
- Scope: type-check + regression after Tasks 1 & 2

## Commands & results

| Check | Command | Result |
|-------|---------|--------|
| Server type-check | `npx tsc --noEmit -p tsconfig.json` (apps/server) | EXIT 0 (no errors) |
| Client type-check | `npx tsc --noEmit -p tsconfig.json` (apps/client) | EXIT 0 (after restoring overwritten `api-error.ts`) |
| Server Jest regression | `npx jest integrations/export/export.service.spec.ts --no-coverage` | 3 passed / 3 |
| Client Vitest regression | `npx vitest run src/lib/api-error.spec.ts` | 4 passed / 4 |

## Notes

- **Collateral fix during verify**: the new helper was first written to `apps/client/src/lib/api-error.ts`, which already existed and exported `getApiErrorMessage` (used by 7 modules). The first client `tsc` surfaced `TS2305: has no exported member 'getApiErrorMessage'`, revealing the overwrite. Restored the original `getApiErrorMessage` and appended `isWorkspaceNotFound` to the same file; re-type-check passed (EXIT 0). No other module was affected.
- Server type-check confirms the new `POST docx-export` route, `ExportDocxPageDto`, `exportPageToDocx`, and `resolveDocxImage` all type-check against the real `@docmost/editor-ext` types (`pageNodeToDocxBuffer`, `DocxImageResolver`).

## Open item (see finding F001)

The actual docx byte generation could not be executed under Jest because the conversion path depends on ESM-only packages that this project's Jest (CommonJS) cannot load. Coverage is therefore at the service-orchestration level. A runtime smoke test against a live server is recommended to fully prove the end-to-end `.docx` output.
