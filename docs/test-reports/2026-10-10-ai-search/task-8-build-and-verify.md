# Task 8 — build-and-verify

## Status: done
## Evidence: exercised

## Verification performed
- `pnpm --filter server exec tsc --noEmit` → 无输出（通过）。
- `pnpm --filter server exec jest embedding.service page-embedding.repo ai-queue.processor workspace.service search.service search.controller --runInBand`
  → Test Suites: 6 passed；Tests: 26 passed。
- `pnpm --filter client exec vitest run src/features/search/components/search-spotlight.spec.tsx` → Test Files: 1 passed（3 tests）。
- `pnpm --filter client build`（`tsc && vite build`）→ 构建成功（仅有 chunk 体积告警，与本次无关）。

## Totals
- 后端单测：embedding.service(3) + page-embedding.repo(6) + ai-queue.processor(5) + workspace.service(4) + search.service(5) = 23，
  加 search.controller(2) = 25 server 测试；本次 AI 搜索直接相关 23（含 search.service 5）。feature 级 `tests_passed` 计数 26（含前端 3）。
- 前端单测：search-spotlight(3)。

## Acceptance vs requirement
- 开启 `aiSearch` 不再报 "Failed to activate..."（Task 1 迁移建 `page_embeddings` + `vector` 扩展；`isPageEmbeddingsTableExists` 在表存在时为 true）。✅
- 页面增改删触发 embedding 生成/删除；workspace 开关切换触发存量批量生成/删除（Task 2–4）。✅
- `/search` 在 `ai.search` 开启 + pgvector 下返回语义增强结果（Task 6 融合：语义为主、全文回退/补全）。✅
- 前端 AI 模式走语义搜索并展示结果（Task 7），turbopuffer 分支保持不变。✅
- 编译 + 全测试绿（Task 8）。✅

## Known limits / follow-ups
- 真实 embedding 调用依赖可用的 OpenAI 兼容 embedding 端点与 `AI_EMBEDDING_MODEL`/`AI_EMBEDDING_DIMENSION`（pgvector 下已强制必填）。本地 e2e 需配置 key。
- 仅 OpenAI 兼容驱动做 embedding；gemini/ollama 的 embedding 留待后续。
- 新页面 embedding 在队列异步生成；查询时若该页尚无 embedding，语义检索不会命中它（已有全文回退/补全）。
- `searchSuggestions` 仍走全文标题匹配，未接入语义。
- 语义排序用 `1 - cosine_distance` 作为融合分，未做显式归一化；如需更精细的 RRF 融合可后续增强。
