# Task 1 — client-config-fallback (test report)

**File:** `apps/client/src/lib/config.ts` (modified) + `apps/client/src/lib/config.spec.ts` (new)
**Runner:** vitest (`pnpm --filter client exec vitest run src/lib/config.spec.ts`)
**Result:** ✅ 8/8 passed

## What changed
`getFileUploadSizeLimit()` / `getFileImportSizeLimit()` now parse the raw config with `bytes(...)` and fall back to the default (`50mb` / `200mb`) whenever the parsed value is `null`/`NaN` or `<= 0`. This fixes the "0.0 KB" error that appeared when `FILE_UPLOAD_SIZE_LIMIT` was empty or `0`.

## Tests (RED→GREEN)
| Case | Config | Expected | Result |
|------|--------|----------|--------|
| unset | — | `bytes("50mb")` | ✅ |
| empty `""` | `""` | `bytes("50mb")` | ✅ |
| `"0"` | `"0"` | `bytes("50mb")` | ✅ |
| `"0mb"` | `"0mb"` | `bytes("50mb")` | ✅ |
| `"100mb"` | `"100mb"` | `bytes("100mb")` | ✅ |
| import unset | — | `bytes("200mb")` | ✅ |
| import empty | `""` | `bytes("200mb")` | ✅ |
| import `"500mb"` | `"500mb"` | `bytes("500mb")` | ✅ |

Before the fix the empty/`0`/`0mb` cases returned `null`/`0` → "0.0 KB" error; after the fix they resolve to the default.

## Verification
- `vitest run` 8/8 ✅
- client `tsc --noEmit -p tsconfig.json` clean ✅
- client `eslint` could NOT run: environment missing `@tanstack/eslint-plugin-query` (plugin not installed) — infra issue, not a code defect.
