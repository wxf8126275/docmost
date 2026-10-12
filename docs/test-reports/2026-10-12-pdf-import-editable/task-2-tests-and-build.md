# Task 2: tests-and-build

Status: done
Tests: 2 passed / 2 total

## Verification
- `npx jest ee/document-import/pdf-import.service.spec` → 2/2 pass.
- `npx tsc --noEmit -p tsconfig.build.json` → no type errors.
- `npx eslint src/ee/document-import` → clean.
