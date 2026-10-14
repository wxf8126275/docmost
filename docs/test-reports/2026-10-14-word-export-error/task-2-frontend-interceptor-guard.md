# Test Report — Task 2: frontend-interceptor-guard

- Status: PASS
- Tests: 4 passed / 4 total
- Fixes: 0
- Command: `npx vitest run src/lib/api-error.spec.ts`

## What was built

Extracted the 404 error-handling logic from `apps/client/src/lib/api-client.ts`'s response interceptor into a pure, type-safe helper `isWorkspaceNotFound(error)` in a new module `apps/client/src/lib/api-error.ts`, and called it from the `case 404` branch.

- **Root-cause fix**: the original code did `error.response.data.message.toLowerCase()` directly. For blob responses (e.g. docx export, which uses `responseType: "blob"`) the 404 body is a `Blob`, so `data.message` is `undefined` and `.toLowerCase()` threw `Cannot read properties of undefined (reading 'toLowerCase')` — the exact error the user reported. The new helper guards `typeof message === 'string'` before lowercasing, so it never throws on blob/no-message bodies.
- **Behavior preserved**: a real JSON `workspace not found` 404 still triggers the existing console log + redirect to the setup route; other messages and blob bodies are left alone.

## Test cases (behavior, not implementation)

1. **Blob 404 body** — `data` is a `Blob` (no `message`): helper returns `false` and does **not** throw. This is the regression guard for the originally reported crash.
2. **JSON "workspace not found"** — returns `true`.
3. **Different message** (`page not found`) — returns `false`.
4. **No response / undefined error** — returns `false` without throwing.

## Conventions self-review

- Function length: `isWorkspaceNotFound` is 9 lines — under 40.
- No `any`; uses a precise `ResponseLike` cast for the error shape.
- WHY comment explains the blob-body guard.
- No `TODO`/`FIXME`.
- The helper is extracted to its own module so the test does not have to import the `window`/axios-dependent `api-client` (which would fail under a headless test env).
