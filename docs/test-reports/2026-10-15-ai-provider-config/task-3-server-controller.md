# Task 3: server-controller

Status: done
Tests: 6 passed / 6 total
Fixes: 1 (made controller methods `async` so a synchronous `assertManage` throw is caught by `rejects`)

## What was done

- **`core/ai/ai-provider.controller.ts`**: `AiProviderController` (`@Controller('ai-providers')`, `JwtAuthGuard`) exposing:
  - `POST ''` → listProviders
  - `POST 'create'` → createProvider
  - `POST 'update'` → updateProvider (strips `id`, passes patch)
  - `POST 'delete'` → deleteProvider
  - `POST 'set-default'` → updateProvider with `{ isDefault: true }`
  - Admin gate via CASL `Manage/Settings` ability (same gate as workspace settings; UI already hides from non-admins).
- **`core/ai/ai.module.ts`**: registered `AiProviderController`.

## RED → GREEN

- RED: spec failed to compile — `./ai-provider.controller` did not exist.
- GREEN: implemented controller + module wiring; all 6 tests pass.

## Acceptance

- All CRUD endpoints delegate to `AiProviderService`. ✓
- `apiKey` plaintext never returned (responses carry `hasApiKey`). ✓
- Non-admins get `ForbiddenException`. ✓

## Notes

- Reused `WorkspaceCaslSubject.Settings` for authorization (providers are a workspace-settings capability), avoiding a new CASL subject.
- `set-default` reuses `updateProvider({ isDefault: true })` so the single-default guarantee lives in one place (`AiProviderRepo.setDefault`).
