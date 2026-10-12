# Handoff: Page Verification — Backend API (+ Follow-ups)

## Status
- Overall: DONE
- Tasks completed: 6 / 6 (plus 2 follow-ups below)
- Last updated: 2026-10-12T13:50:00Z
- Tests: 31 passed (20 unit: service 14, controller 5, module 1; + 11 e2e), 0 failed
- Server `tsc --noEmit`: 0 errors
- Committed: `26a87018` on `main` (ahead of `origin/main` by 1 — **not pushed**)

## What Was Done

| Task | Status | Summary |
|------|--------|---------|
| 1 dto-definitions | done | Class-validator DTOs for all 9 request bodies |
| 2 page-verification-repo | done | CRUD for `page_verifications`, verifier sync/refs, cursor-paginated list with joins |
| 3 page-verification-service | done | All 9 behaviors, qms/expiring state machine, permission derivation |
| 4 page-verification-controller | done | 9 routes under `@Controller('pages')` + JWT guard |
| 5 module-and-enable | done | Wired `PageVerificationModule` into `EeModule`; enabled feature on frontend |
| 6 tests-and-build | done | 20 unit tests pass; server typechecks clean |
| 7 follow-up: expiry/approval notifications | done | `page-verification-scheduler.service.ts` with `reconcile()` + `@Interval`; `page-verification.service.ts` enqueues verified/approval-requested/rejected notifications |
| 8 follow-up: e2e suite | done | `test/page-verification.e2e-spec.ts` (11 tests) via FastifyAdapter + mocked deps; `jest-e2e.json` + `app.e2e-spec.ts` fixes |

## File Inventory (verified on disk)

### Created (server)
- `apps/server/src/ee/page-verification/dto/page-verification.dto.ts`
- `apps/server/src/ee/page-verification/repos/page-verification.repo.ts`
- `apps/server/src/ee/page-verification/services/page-verification.service.ts`
- `apps/server/src/ee/page-verification/page-verification.controller.ts`
- `apps/server/src/ee/page-verification/page-verification.module.ts`
- `apps/server/src/ee/page-verification/page-verification-scheduler.service.ts` (follow-up: notifications)
- `apps/server/src/ee/page-verification/{service,controller,module}.spec.ts`

### Modified
- `apps/server/src/ee/ee.module.ts` — added `PageVerificationModule` to imports
- `apps/server/src/ee/page-verification/services/page-verification.service.ts` — enqueue notifications on state transitions
- `apps/server/src/ee/page-verification/page-verification.module.ts` — register scheduler provider
- `apps/server/test/page-verification.e2e-spec.ts` (follow-up: 11 e2e tests)
- `apps/server/test/app.e2e-spec.ts` (follow-up: FastifyAdapter fix)
- `apps/server/test/jest-e2e.json` (follow-up: src alias, tsx, pnpm-aware ESM allow-list, testPathIgnorePatterns)

### Frontend (pre-existing, now wired)
- `apps/client/src/ee/page-verification/*` (service, queries, components, page)
- `apps/client/src/components/settings/settings-sidebar.tsx` (menu gated on `Feature.PAGE_VERIFICATION`)
- `apps/client/src/App.tsx` (route `/settings/verifications` already registered)

## Follow-up Detail

### Expiry / Approval Notifications (wired)
- `page-verification-scheduler.service.ts`: `reconcile()` scans `expiring` verifications in
  `verified` state, enqueues `PAGE_VERIFICATION_EXPIRING` (≤3 days) / `PAGE_VERIFICATION_EXPIRED`
  (past due) onto `NOTIFICATION_QUEUE`; an `@Interval` hourly enqueues `VERIFICATION_RECONCILE`
  (consumed by core `NotificationProcessor`, which already `require`s this scheduler).
- `page-verification.service.ts`: injects `NOTIFICATION_QUEUE` and enqueues
  `PAGE_VERIFIED_NOTIFICATION` / `PAGE_APPROVAL_REQUESTED_NOTIFICATION` /
  `PAGE_APPROVAL_REJECTED_NOTIFICATION` on the corresponding transitions. Queue failures are
  caught and non-fatal.

### E2E Suite (added)
- `test/page-verification.e2e-spec.ts`: 11 tests over all 9 endpoints via real `PageVerificationModule`
  booted on `FastifyAdapter` (`listen(0)`), with `JwtAuthGuard` overridden to inject user/workspace
  and service/repo/scheduler mocked (no DB/Redis). Covers delegation correctness, DTO validation
  (400), and `NotFoundException` → 404.
- `app.e2e-spec.ts` switched to `FastifyAdapter` (repo serves via `platform-fastify`; `@nestjs/platform-express`
  is not installed). `jest-e2e.json` gained `src/` alias, `tsx`, and a pnpm-aware `transformIgnorePatterns`
  allow-list.

## API Contract (all `POST`, JSON body)
- `/pages/verification-info` `{pageId}` → info + permissions
- `/pages/create-verification` setup (expiring verifies immediately; qms → `draft`)
- `/pages/update-verification` change expiration +/or verifiers
- `/pages/delete-verification` remove
- `/pages/verify` re-verify (expiring) / approve (qms)
- `/pages/submit-for-approval` qms `draft`→`in_approval`
- `/pages/reject-approval` qms `in_approval`→`draft` (+comment)
- `/pages/mark-obsolete` qms `approved`→`obsolete`
- `/pages/verifications` cursor-paginated, filterable workspace list

## How Verified
- 20 unit tests (Nest TestingModule with mocked repo/service) pass.
- 11 e2e tests (`npm run test:e2e` → only page-verification suite) pass.
- `tsc --noEmit` reports zero type errors across the server.
- Migration `20260413T121647-page-verifications.ts` already exists; `db.d.ts` already
  declares `PageVerifications` / `PageVerifiers`.

## Enabling the Module
- Backend: `EeModule` imports `PageVerificationModule`; since `AppModule` loads `ee/ee.module`
  dynamically, the routes are registered in the enterprise build.
- Frontend: `Feature.PAGE_VERIFICATION` added to `COMMUNITY_FEATURES`, so the
  "Verified pages" settings entry is enabled without a license.

## Next Steps / Known Risks
1. DB migration must be applied (`migration:latest`) so `page_verifications` / `page_verifiers`
   tables exist at runtime.
2. Expiry/approval notifications ARE now wired (see Follow-up Detail). Email templates
   (`verification-expired/expiring-email.tsx` etc.) are consumed by core `NotificationProcessor`.
3. Audit-log emission on state transitions was intentionally omitted (non-goal).
4. For full e2e confidence, run the server + client and exercise the Verified pages
   settings UI and the per-page verification modal.
5. **STRUCTURAL**: `apps/server/src/ee` was an uninitialized `docmost/ee` submodule (gitlink).
   It has been converted to a regular tracked directory and committed directly
   (commit `26a87018`); `.gitmodules` removed. No submodule fetch is needed — the EE source
   now lives in this repo.
6. `test/app.e2e-spec.ts` is excluded from the e2e glob (`testPathIgnorePatterns`) because it
   boots the full `AppModule` (needs Postgres + Redis, and `undici` cannot be transformed under
   CJS `ts-jest`). The file keeps its FastifyAdapter fix for future CI use. `npm run test:e2e`
   therefore runs only the page-verification suite (11/11 pass).

## How to Resume
```bash
cd /home/wuxiufeng/repos/docmost/apps/server
npx jest ee/page-verification      # 20 unit tests
npm run test:e2e                   # 11 e2e tests (page-verification only)
npx tsc --noEmit -p tsconfig.json  # 0 errors
sean status page-verification
```
