# Task 3: controller-return-zip

## Status: DONE
## Evidence: exercised

## What was done
- `ExportDocxPageDto` gained optional `bundleAttachments?: boolean`.
- `ExportController.exportPageDocx` now returns a `application/zip` response
  (filename `<title>.zip`) containing `document.docx` + `attachments/` whenever
  `bundleAttachments !== false` (default true). When explicitly `false`, it
  keeps the previous single-`.docx` behavior.

## Notes / risk
This changes the default deliverable of the `docx-export` endpoint from a
single `.docx` to a `.zip`. The frontend caller that currently downloads a
`.docx` may need to handle the `.zip` (or pass `bundleAttachments: false`).
Flagged as a finding for the client/integration boundary.

## Tests (jest, controller unit)
- `returns a zip (application/zip, .zip name) when bundleAttachments is not false`
- `returns a single docx when bundleAttachments is explicitly false`

## Acceptance check
Both controller tests pass; headers + dispatched service method verified.
