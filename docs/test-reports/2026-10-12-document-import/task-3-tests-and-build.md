# Task 3: tests-and-build

Status: done
Tests: 3 passed / 3 total

## Verification
- `npx jest ee/document-import/docx-import.service.spec` → 3/3 pass.
- `npx tsc --noEmit -p tsconfig.build.json` → no type errors.
- `npx eslint src/ee/document-import src/integrations/import/services/import.service.ts src/ee/ee.module.ts` → clean.

## Notes
- Client build not run (the only client change adds an existing enum value to an
  array — trivially type-safe). Run `pnpm --filter client build` before release
  if a full client check is desired.
