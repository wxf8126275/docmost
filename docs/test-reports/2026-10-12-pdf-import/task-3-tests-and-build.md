# Task 3: tests-and-build

Status: done
Tests: 3 passed / 3 total

## Verification
- `npx jest ee/document-import/pdf-import.service.spec` → 3/3 pass.
- `npx tsc --noEmit -p tsconfig.build.json` → no type errors.
- `npx eslint src/ee/document-import` → clean.
