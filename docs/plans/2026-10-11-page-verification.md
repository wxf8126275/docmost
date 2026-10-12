# Plan: Page Verification — Backend API

Generated: 2026-10-11T00:00:00Z
Requirement: ../requirements/2026-10-11-page-verification.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | dto-definitions | — | low | yes |
| 2 | page-verification-repo | 1 | medium | no |
| 3 | page-verification-service | 2 | high | no |
| 4 | page-verification-controller | 3 | medium | no |
| 5 | page-verification-module-and-enable | 4 | low | no |
| 6 | tests-and-build | 5 | medium | no |

## Dependency Graph
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

## Task Details

### Task 1: dto-definitions
- **Creates**: `apps/server/src/ee/page-verification/dto/page-verification.dto.ts`
- **Modifies**: —
- **Test**: `apps/server/src/ee/page-verification/page-verification.service.spec.ts` (covers service; DTO validated via global ValidationPipe)
- **Acceptance**: Class-validator DTOs for all 9 request bodies.

### Task 2: page-verification-repo
- **Creates**: `apps/server/src/ee/page-verification/repos/page-verification.repo.ts`
- **Modifies**: —
- **Test**: repo covered indirectly via service spec (repo uses real Kysely types; unit-tested through service with mocked repo).
- **Acceptance**: CRUD for `page_verifications`, verifier sync, user refs, cursor list.

### Task 3: page-verification-service
- **Creates**: `apps/server/src/ee/page-verification/services/page-verification.service.ts`
- **Modifies**: —
- **Test**: `apps/server/src/ee/page-verification/page-verification.service.spec.ts`
- **Acceptance**: All 9 behaviors + state machine + permission derivation.

### Task 4: page-verification-controller
- **Creates**: `apps/server/src/ee/page-verification/page-verification.controller.ts`
- **Modifies**: —
- **Test**: `apps/server/src/ee/page-verification/page-verification.controller.spec.ts`
- **Acceptance**: 9 routes mapped, auth guards, delegates to service.

### Task 5: page-verification-module-and-enable
- **Creates**: `apps/server/src/ee/page-verification/page-verification.module.ts`
- **Modifies**: `apps/server/src/ee/ee.module.ts`, `apps/client/src/ee/features.ts`
- **Test**: `apps/server/src/ee/page-verification/page-verification.module.spec.ts`
- **Acceptance**: Module wired into EeModule; `PAGE_VERIFICATION` added to COMMUNITY_FEATURES.

### Task 6: tests-and-build
- **Modifies**: —
- **Test**: full `apps/server` build + jest run for page-verification
- **Acceptance**: `tsc`/build passes, new tests pass.
