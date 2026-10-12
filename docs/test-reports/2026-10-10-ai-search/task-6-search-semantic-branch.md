# Task 6 — search-semantic-branch

## Status: done
## Evidence: exercised

## What was done
- `apps/server/src/core/search/dto/search.dto.ts`：新增可选 `aiSearch?: boolean`（`@IsOptional() @IsBoolean()`）。`search.controller.ts` 已把整个 `SearchDTO` 透传给 `searchPage`，无需额外改动。
- `apps/server/src/core/search/search.service.ts`：
  - `searchPage` 成为入口：当 `searchParams.aiSearch === true` 且 `query` 非空时，经 `isSemanticSearchEnabled(workspaceId)` 判断（要求 `environmentService.getAiVectorDriver() === 'pgvector'` 且 `workspace.settings.ai.search === true`），走语义分支；否则走原全文检索。
  - 原全文逻辑整体抽取为 `searchFullText`（行为不变）。
  - 新增 `searchSemanticOrFallback`：以语义检索为主，若语义无命中则回退全文，若语义结果不足 `limit` 则用全文结果补全（去重融合）。
  - 新增 `searchSemantic`：用 `EmbeddingService.embed([query])` 取得 `queryVec`，调用 `PageEmbeddingRepo.vectorSearch(workspaceId, queryVec, {limit, spaceId})` 取得 `{pageId, distance}`；按与原全文检索一致的权限/空间门控（`spaceMemberRepo.getUserSpaceIdsQuery` / `pagePermissionRepo.filterAccessiblePageIds` / publicPageIds / shareId）过滤；按 `rank = 1 - distance`（余弦距离越小越相似）排序并截取 `limit/offset`。
  - 注入 `EmbeddingService`、`PageEmbeddingRepo`、`WorkspaceService`、`EnvironmentService`；新增 `Logger` 用于语义失败时告警回退。
- `apps/server/src/core/search/search.module.ts`：`imports` 增加 `WorkspaceModule`（提供 `WorkspaceService`）。
- `apps/server/src/core/search/search.service.spec.ts`：重写为 mock 驱动（重建 db 链式 mock + 各 Repo/Service mock），覆盖语义开关、回退、融合、关闭时不调用 embed。
- `apps/server/src/core/search/search.controller.spec.ts`：第一个 `should be defined` describe 原本未提供依赖（既有问题，与本次无关），改为直接 `new SearchController(...)` 构造以避免 guard 依赖解析失败。

## TDD
- RED: 语义分支不存在。
- GREEN: `search.service.spec.ts` 5 passed（开启时调用 embed+vectorSearch 且排序正确；关闭不调用 embed；未请求走全文；语义无命中回退全文；语义不足时全文补全）。

## Tests
- `search.service.spec.ts` — 5 passed（语义开关、关闭、未请求、回退、融合补全）。
- 关联回归（`search.controller.spec` 2、`workspace.service.spec` 4、`embedding.service.spec` 3、`page-embedding.repo.spec` 6、`ai-queue.processor.spec` 5）→ 共 6 套件 26 passed。

## Verification
- `pnpm --filter server exec tsc --noEmit` → 通过。
- `jest search.service search.controller embedding.service page-embedding.repo ai-queue.processor workspace.service --runInBand` → 6 suites, 26 passed。

## Known limits
- 语义分支仅作用于 `POST /search`（已认证 / share / public-space 三条路径均会带 `aiSearch`）。`searchSuggestions` 仍走全文（按标题模糊匹配），未接入语义。
- 余弦距离在 `[0,2]`，此处以 `1 - distance` 作为排序分（归一化到 `[-1,1]`），足够相对排序；未做显式归一化。
- `search.service.spec.ts` 的 db 链式 mock 为通用 no-op 链，仅断言 embed/vectorSearch 是否被调用及结果，不验证 SQL 文本（SQL 文本由 `page-embedding.repo.spec` 覆盖）。
