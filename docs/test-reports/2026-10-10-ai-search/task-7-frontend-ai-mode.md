# Task 7 — frontend-ai-mode

## Status: done
## Evidence: exercised

## What was done
- `apps/client/src/features/search/types/search.types.ts`：`IPageSearchParams` 增加 `aiSearch?: boolean`，使语义检索参数能传到后端。
- `apps/client/src/features/search/components/search-spotlight.tsx`：
  - 新增 `isPgvectorAi = workspace?.settings?.ai?.search === true && getAiVectorDriver() === 'pgvector'` 与派生的 `useSemanticSearch = isAiMode && isPgvectorAi`。
  - `useUnifiedSearch` 改为 `{ ...searchParams, aiSearch: useSemanticSearch }`，启用条件为 `!isAiMode || useSemanticSearch`：普通模式走全文，pgvector 的 AI 模式走语义 `/search`，turbopuffer 的 AI 模式仍走原有企业级 answer pipeline。
  - `handleAiSearchTrigger` 与 Enter 快捷键增加 `!isPgvectorAi` 守卫：pgvector 模式下不调用 `useAiSearch`（turbopuffer 的 `/api/ai/answers`）。
  - Ask 按钮在 pgvector 模式下隐藏（语义搜索是实时 debounced 的，无需显式触发）。
  - 占位文案区分：pgvector AI 模式显示 "Search with AI..."，turbopuffer 显示 "Ask a question..."。
  - 结果渲染分支由 `isAiMode` 改为 `isAiMode && !isPgvectorAi`：pgvector AI 模式复用 `SearchResultItem` 渲染语义结果（与全文模式同一渲染路径），turbopuffer 才渲染 `AiSearchResult`。
  - `handleSpotlightOpen` 保持仅 turbopuffer 预热 `hintVectorCache()`，pgvector 无需特殊处理。
- `apps/client/src/features/search/components/search-spotlight.spec.tsx`：新增 vitest 组件测试（mock `useUnifiedSearch`/`useAiSearch`/`useHasFeature`/`getAiVectorDriver`/`jotai`/`workspaceAtom` 等），验证：
  - 默认走全文（`aiSearch:false`）。
  - pgvector + ai.search 开启时切到语义搜索（`aiSearch:true` 且 enabled），不触发 turbopuffer 的 `mutate`，并渲染语义结果。
  - ai.search 关闭时（即便 driver=pgvector）不启用语义搜索。

## TDD
- RED: 语义路径未接入。
- GREEN: 3 passed。

## Tests
- `search-spotlight.spec.tsx` — 3 passed。

## Verification
- `pnpm --filter client exec vitest run src/features/search/components/search-spotlight.spec.tsx` → 1 file, 3 passed。
- （client 类型/构建在 Task 8 统一验证。）

## Known limits
- 仅在 `search-spotlight` 接入 pgvector 语义路径；`useUnifiedSearch` 的 `searchPage` 后端分支已在 Task 6 实现。
- turbopuffer 分支逻辑完全保留，未改动其行为。
- 测试用 mock 覆盖了关键分支；未对 Mantine Spotlight 的视觉/动画做断言。
