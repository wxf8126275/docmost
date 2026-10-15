# Task 4: server-zip-tests

## Status: DONE
## Evidence: exercised

## What was done
Extended the export test suite with behavior-level assertions for the new
zip-bundle path. All tests use the REAL `jszip` to validate the produced
archive (not a mock), mirroring the existing ESM-mock approach for the service
orchestration.

- `export.service.spec.ts` additions:
  - `bundles a referenced pdf into the zip and points the docx link at the relative path` (Task 1 + Task 2 assertion)
  - `does not re-bundle image attachments (they are embedded in the docx)`
  - `dedupes attachment file names that collide in the zip` — verifies that
    two attachments with the same file name are written to distinct zip paths
    (`report.pdf` + `report (1).pdf`). This edge case surfaced a real bug
    (the attachment→safeName map was keyed by file name, colliding on
    duplicates); fixed by keying on the unique attachment `src`.
- `export.controller.spec.ts` (new): verifies the `docx-export` endpoint
  returns `application/zip` + `.zip` by default and a single `.docx` when
  `bundleAttachments: false`.

## Regression
Full `src/integrations/export/` suite: 15 passed (3 suites).
