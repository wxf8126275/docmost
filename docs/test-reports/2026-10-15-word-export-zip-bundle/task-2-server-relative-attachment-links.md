# Task 2: server-relative-attachment-links

## Status: DONE
## Evidence: exercised

## What was done
In `generateDocx`, the `getAttachment` resolver now accepts an
`attachmentNames: Map<fileName, safeName>` parameter (populated by
`exportPageToDocxZip`). When a resolved attachment's file name is present in
that map, its `url` is rewritten to the relative `attachments/<safeName>` path
instead of the online download URL.

This makes the `.docx` hyperlink for non-image attachments point at the file
that is bundled alongside `document.docx` in the `.zip`, so the export works
fully offline.

## Tests (jest)
- Covered by the assertion `expect(resolved.url).toBe('attachments/doc.pdf')`
  inside the Task 1 `"bundles a referenced pdf"` test: in bundle mode the
  resolver returns the relative path, not the online URL.

## Acceptance check
Hyperlink target is `attachments/<name>` — verified by the assertion above.
