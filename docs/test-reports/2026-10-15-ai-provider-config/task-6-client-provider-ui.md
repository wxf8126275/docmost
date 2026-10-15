# Task 6: client-provider-ui

Status: done
Tests: 8 passed / 8 total (5 service + 3 component)

## What was done

- **`ee/ai/types/ai-provider.types.ts`**: `AiProviderDriver`, `AiProvider` (no plaintext key; `hasApiKey` flag), `CreateAiProviderInput`, `UpdateAiProviderInput`.
- **`ee/ai/services/ai-provider-service.ts`**: `listAiProviders`, `createAiProvider`, `updateAiProvider` (embeds `id`), `deleteAiProvider`, `setDefaultAiProvider` — all via `api.post` to `/ai-providers`, `/ai-providers/create`, `/ai-providers/update`, `/ai-providers/delete`, `/ai-providers/set-default` (matching `AiProviderController`).
- **`ee/ai/components/provider-settings.tsx`** (full implementation, replaces the Task 5 placeholder): lists providers in a Mantine table (Name / Driver / Completion model / Default badge / actions), an "Add provider" button, a create/edit modal (name, driver select, API key password, base URL, completion model, embedding model, set-default switch), and a delete-confirm modal. Uses `@tanstack/react-query` (`useQuery`/`useMutation`) with cache invalidation; `apiKey` is only sent when non-empty (edit keeps the existing key); non-admins/non-licensed get an enterprise notice.
- **`ee/ai/components/provider-settings.spec.tsx`** + **`ee/ai/services/ai-provider-service.spec.ts`**: component (list renders, modal opens with fields, empty-form submit is blocked) and service (endpoint/body assertions).

## RED → GREEN

- Service spec RED→GREEN after fixing `vi.hoisted` for the `post` mock.
- Component spec RED→GREEN after adding `ResizeObserver`/`matchMedia` jsdom polyfills and scoping modal assertions via `within(dialog)` (table headers share label text with the modal fields) + asserting "no API call on invalid submit" instead of relying on rendered error text.

## Acceptance

- Providers can be listed, created, edited, deleted, and set as default from the UI. ✓
- `apiKey` is never shown back to the client (response carries `hasApiKey`). ✓
- Validation blocks invalid submits. ✓
- Tabs/route wiring from Task 5 still intact (placeholder replaced by the real component). ✓

## Notes

- i18n uses `t(...)` inline English (existing project pattern); keys are self-describing.
- The backend `getActiveProviderConfig` is what actually makes a default provider override environment variables (wired in Task 4).
