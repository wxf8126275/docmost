# Task 1: db-schema-and-repo

Status: done
Tests: 7 passed / 7 total

## What was done

- **Migration** `database/migrations/20261015T120000-add-ai-providers.ts`: creates `ai_providers` table (id uuid pk, workspace_id fk cascade, name, driver, api_key_encrypted, base_url, completion_model, embedding_model, is_default, timestamps, deleted_at) + workspace index. `down` drops the table.
- **`db.d.ts`**: added `AiProviders` table interface (alphabetical) and registered `aiProviders` in the `DB` interface.
- **`entity.types.ts`**: added `AiProvider`, `InsertableAiProvider`, `UpdatableAiProvider`.
- **`core/ai/repos/ai-provider.repo.ts`**: Kysely repo with `createProvider`, `updateProvider`, `findById`, `listByWorkspace`, `findDefault`, `deleteProvider` (soft delete), `setDefault` (clears other defaults first → enforces single default per workspace).

## RED → GREEN

- RED: spec failed to compile — `./ai-provider.repo` and `AiProvider` type did not exist.
- GREEN: implemented migration/types/repo; all 7 repo tests pass.

## Acceptance

- Migration is valid Kysely (compiles). ✓
- Repo spec green: insert/list/findDefault/setDefault(唯一)/delete. ✓
- Workspace isolation enforced via `where('workspaceId', ...)` in every query. ✓

## Notes

- Repo uses mock-DB pattern (Proxy) like other `*.repo.spec.ts`; SQL semantics (e.g. single-default guarantee) are structurally enforced in `setDefault` and asserted at the service layer (Task 2).
