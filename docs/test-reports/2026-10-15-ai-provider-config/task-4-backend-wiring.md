# Task 4: backend-wiring

Status: done
Tests: 24 passed / 24 total (4 suites: embedding.service, ai-chat-llm.client, ai-chat.service, ai-queue.processor)

## What was done

- **`core/ai-chat/services/ai-chat-llm.client.ts`**: `streamChat` / `buildModel` accept an optional `ResolvedAiProvider` override. When present, `apiKey`, `baseUrl` and `completionModel` come from the provider instead of env.
- **`core/ai/services/embedding.service.ts`**: `embed(texts, provider?)` uses the provider's `apiKey` / `baseUrl` / `embeddingModel` when supplied.
- **`core/ai-chat/services/ai-chat.service.ts`**: `sendMessage` resolves `getActiveProviderConfig(workspaceId)` and passes it to `streamChat`.
- **`core/ai/processors/ai-queue.processor.ts`**: `embedPages(workspaceId, pages)` resolves the default provider and passes it to `embed()`; embedding model name stored with vectors follows the provider.
- **`core/ai-chat/ai-chat.module.ts`**: provides `AiProviderService` + `AiProviderRepo` (with `EncryptionModule`) so chat can resolve providers without re-instantiating the AI queue worker.
- Updated all affected specs for the new constructor arg + added provider-override tests.

## RED → GREEN

- Wiring + override tests added and run; all 24 tests pass (including the env-fallback path unchanged).

## Acceptance

- Chat and embedding clients honor a provider override. ✓
- `getActiveProviderConfig` is the single resolution point: default provider wins, else env fallback (behavior unchanged without a provider). ✓
- AI chat and AI search/embeddings now actually use the workspace-configured default provider. ✓

## Notes

- `AiChatService` gets `AiProviderService` directly (module-provided, not via `AiModule` import) to avoid spinning up a second `AiQueueProcessor` BullMQ worker.
- `ResolvedAiProvider` (from `core/ai/dto/ai-provider.dto`) is the shared override type; clients import it (type-only) from `core/ai`.
- `baseURL` is passed as `undefined` when empty so `createOpenAI` uses its default.
