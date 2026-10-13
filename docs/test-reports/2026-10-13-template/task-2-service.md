# Task 2 — template-service — Test Report

**Date:** 2026-10-13
**Feature:** template
**Status:** exercised (RED → GREEN)

## Summary
Unit tests for `TemplateService` with all repositories (`TemplateRepo`, `SpaceMemberRepo`, `WorkspaceRepo`) and `PageService` mocked. 15 tests, 15 passing. One fix cycle: `assertCanManageTemplates` is `async`, so its rejection must be `await`ed inside `createTemplate`/`updateTemplate`/`deleteTemplate` — otherwise the rejection floated as an unhandled rejection and crashed the Jest worker.

## Test cases
- `listTemplates` → delegates to `TemplateRepo.findTemplates` with `accessibleSpaceIds` from `SpaceMemberRepo.getUserSpaceIds`.
- `getTemplate` → returns template with content; `NotFoundException` when missing.
- `createTemplate` → admin allowed; member allowed only when `workspace.settings.templates.allowMemberTemplates === true`; member forbidden otherwise.
- `updateTemplate` → member forbidden; admin updates allowed fields + `lastUpdatedById`; `NotFoundException` when missing.
- `deleteTemplate` → member forbidden; admin deletes.
- `useTemplate` → forbids target space outside `accessibleSpaceIds`; creates a page via `PageService.create` (format `json`) for an accessible space; creates an empty page when template `content` is null.

## How to run
```
pnpm --filter server jest ee/template/template.service.spec.ts
```

## Verifier
`pnpm --filter server test` (unit). No DB required (mocks).
