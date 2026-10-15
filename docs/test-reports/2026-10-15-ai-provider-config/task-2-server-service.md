# Task 2: server-service

Status: done
Tests: 10 passed / 10 total

## What was done

- **`core/ai/dto/ai-provider.dto.ts`**: `AI_PROVIDER_DRIVERS` constant + `AiProviderDriver` type; `CreateAiProviderDto`, `UpdateAiProviderDto` (class-validator, `apiKey` optional on update), `AiProviderResponseDto` (no plaintext key; `hasApiKey` flag); exported `ResolvedAiProvider` interface.
- **`core/ai/services/ai-provider.service.ts`**: `AiProviderService` with `createProvider` (encrypts `apiKey`, sets default if requested), `updateProvider` (re-encrypts only when `apiKey` provided, never overwrites with empty), `listProviders` (strips key), `deleteProvider`, `getActiveProviderConfig` (default provider decrypted → else env fallback), and `toResponse` mapping.
- **`core/ai/ai.module.ts`**: registered `AiProviderService` + `AiProviderRepo`; imported `EncryptionModule`.

## RED → GREEN

- RED: spec failed to compile — `./ai-provider.service` and `../dto/ai-provider.dto` did not exist.
- GREEN: implemented DTOs + service + module wiring; all 10 tests pass.

## Acceptance

- `apiKey` encrypted at rest; responses never expose plaintext/`apiKeyEncrypted`. ✓
- Single default enforced via `setDefault`. ✓
- `getActiveProviderConfig` returns default provider config (decrypted) **or** environment fallback — keeps current behavior without a provider. ✓
- `updateProvider` does not corrupt the key when omitted. ✓

## Notes

- `getActiveProviderConfig` fallback uses `getAiChatModel()` for completion (matches the chat client's actual env call site) and `getAiEmbeddingModel()` for embeddings. `AI_COMPLETION_MODEL` (`getAiCompletionModel`) is currently unused by the clients and intentionally not part of the fallback.
