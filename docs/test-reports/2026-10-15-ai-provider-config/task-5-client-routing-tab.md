# Task 5: client-routing-tab

Status: done
Tests: 4 passed / 4 total

## What was done

- **`ee/features.ts`**: added `AI_PROVIDERS: 'ai:providers'` to the `Feature` map and to `COMMUNITY_FEATURES` (so self-hosted community instances can manage providers without a license, matching how AI/MCP are treated).
- **`App.tsx`**: added route `ai/providers` → `<AiSettings />`.
- **`ee/ai/pages/ai-settings.tsx`**: added a `Providers` tab (value `providers`) at the same level as `AI` / `MCP`; `activeTab` derives from the path (`/providers`); `handleTabChange` navigates to `/settings/ai/providers`; added the `providers` panel rendering `<ProviderSettings />`.
- **`ee/ai/components/provider-settings.tsx`**: placeholder (full implementation in Task 6).
- **`ee/ai/pages/ai-settings-tab.spec.tsx`**: verifies the feature flag, the three tabs render, the provider panel renders, and non-admins see nothing.

## RED → GREEN

- RED: spec failed — `Feature.AI_PROVIDERS` undefined + mock gaps (`workspaceAtom` export, `useAtomValue` comes from `jotai`).
- Fixes: added the feature flag; mocked `jotai.useAtomValue` (preserving other exports) and the `workspaceAtom` export. All 4 tests pass.

## Acceptance

- Route `/settings/ai/providers` renders the AI settings page with a `Providers` tab alongside `AI` and `MCP`. ✓
- `Feature.AI_PROVIDERS` is a community feature. ✓
- Non-admins get no page (consistent with the rest of the settings). ✓

## Notes

- The placeholder `ProviderSettings` is intentionally minimal; Task 6 replaces it with the real management UI, API service, and types.
