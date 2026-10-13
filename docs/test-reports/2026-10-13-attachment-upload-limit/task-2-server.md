# Task 2 — server-env-fallback (test report)

**File:** `apps/server/src/integrations/environment/environment.service.ts` (modified) + `apps/server/src/integrations/environment/environment.service.spec.ts` (new)
**Runner:** jest (`pnpm --filter server jest environment.service.spec`)
**Result:** ✅ 6/6 passed (after 1 fix cycle)

## What changed
`getFileUploadSizeLimit()` / `getFileImportSizeLimit()` validate the resolved value with `bytes(...)` and return the default (`'50mb'` / `'200mb'`) when it is not a positive number. This ensures the value injected into `window.CONFIG` (static.module.ts) and used by `attachment.controller.ts:99` (multer `fileSize`) is never empty/`0`.

## Fix cycle (1)
First implementation only rejected empty/whitespace strings (`val && val.trim() !== ''`). The test `falls back to 50mb when the value is "0"` then FAILED — `"0"` passed the trim check and was returned as-is, but `bytes("0") === 0` still yields the "0.0 KB" symptom and a multer limit of 0. Fixed by validating with `bytes(val) > 0` instead of a string-only check.

## Tests (RED→GREEN)
| Case | `ConfigService.get` | Expected | Result |
|------|---------------------|----------|--------|
| upload empty | `""` | `"50mb"` | ✅ |
| upload whitespace | `"   "` | `"50mb"` | ✅ |
| upload `"0"` | `"0"` | `"50mb"` | ✅ |
| upload `"100mb"` | `"100mb"` | `"100mb"` | ✅ |
| import empty | `""` | `"200mb"` | ✅ |
| import `"500mb"` | `"500mb"` | `"500mb"` | ✅ |

## Verification
- `jest` 6/6 ✅
- server `tsc --noEmit -p tsconfig.build.json` clean ✅
- server `eslint` clean ✅
