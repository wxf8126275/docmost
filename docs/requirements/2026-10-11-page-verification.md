# Page Verification — Backend API

## Problem
The settings "Verified pages" module already has a complete frontend
(`apps/client/src/ee/page-verification/`) and a database migration
(`20260413T121647-page-verifications.ts`) plus generated db types. The backend
HTTP layer was never implemented, so the feature is non-functional and the
settings menu entry is gated off. We need to complete the backend API and enable
the module so the existing frontend works end-to-end.

## Behaviors
- `POST /pages/verification-info` — read the verification state for a page
  (status, verifiers, actors, computed permissions).
- `POST /pages/create-verification` — set up verification on a page (expiring or
  qms workflow). Expiring type verifies immediately; qms starts as a `draft`.
- `POST /pages/update-verification` — change expiration settings and/or verifiers.
- `POST /pages/delete-verification` — remove verification from a page.
- `POST /pages/verify` — re-verify (expiring) or approve (qms).
- `POST /pages/submit-for-approval` — move qms draft → `in_approval`.
- `POST /pages/reject-approval` — return qms `in_approval` → `draft` with comment.
- `POST /pages/mark-obsolete` — move qms `approved` → `obsolete`.
- `POST /pages/verifications` — cursor-paginated, filterable workspace-wide list.
- Enable the module on the frontend by adding `PAGE_VERIFICATION` to community
  features and wiring the EE module into `EeModule`.

## Acceptance Criteria
- All 9 endpoints resolve and return the shapes the frontend expects → verifiable by test/manual (frontend `page-verification-service.ts` contract).
- Setup (expiring) sets status `verified` + `expiresAt`; setup (qms) sets `draft` → verifiable by unit test.
- Status transitions (verify / submit / reject / obsolete) enforce the documented
  state machine → verifiable by unit test.
- Permissions (`canVerify`, `canManage`, `canSubmitForApproval`,
  `canMarkObsolete`) derived from page edit access + verifier membership →
  verifiable by unit test.
- `EeModule` imports `PageVerificationModule` and the settings menu is no longer
  gated → verifiable by build + manual.
- `tsc`/build passes and new unit tests pass → verifiable by test command.

## Context
- Tech stack: NestJS (server), React/Mantine (client), Kysely (SQL), Postgres.
- Related features: `apps/server/src/ee/audit` (pattern to mirror:
  controller/service/repo/dto/module), `apps/client/src/ee/page-verification`.
- Constraints: must reuse the existing frontend contract exactly; must not break
  the existing OSS build (EE module is conditionally loaded via `AppModule`).
- Non-goals: email/notifications on expiry, audit-log emission, SCIM/license
  enforcement. Those are out of scope for this pass.
