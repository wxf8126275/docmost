# Task 4 — ai-queue-processor

## Status: done
## Evidence: exercised

## What was done
- 新建 `apps/server/src/core/ai/processors/ai-queue.processor.ts`：`@Processor(QueueName.AI_QUEUE) AiQueueProcessor extends WorkerHost`，消费 embedding 相关 job：
  - `GENERATE_PAGE_EMBEDDINGS` / `WORKSPACE_CREATE_EMBEDDINGS` / `PAGE_CREATED` / `PAGE_UPDATED` / `PAGE_RESTORED` → `generateEmbeddings(workspaceId, pageIds?)`。
  - `DELETE_PAGE_EMBEDDINGS` / `PAGE_DELETED` / `PAGE_SOFT_DELETED` → `deleteByPageIds`。
  - `WORKSPACE_DELETE_EMBEDDINGS` → `deleteByWorkspace`；`WORKSPACE_RESET_EMBEDDINGS` → 先删后全量生成。
  - `generateEmbeddings` 先经 `workspaceService.findById` 校验 `settings.ai.search !== true` 则 skip（避免为非 AI 工作区浪费 embedding 调用）。
  - `generateForWorkspace` 分批（100）遍历工作区页面，调用 `embeddingService.embed` + `pageEmbeddingRepo.insertEmbeddings`。
- 修改 `apps/server/src/database/listeners/page.listener.ts` 的 `handlePageUpdated`：PAGE_UPDATED 事件同时向 `aiQueue` 投递 `GENERATE_PAGE_EMBEDDINGS`（内容更新→重算 embedding）。

## TDD
- RED: `ai-queue.processor.spec.ts` 先写，初版因 `workspace.settings` 类型为 `JsonValue`（无 `ai` 字段）编译失败 TS2339；修正 `(workspace?.settings ?? {}) as { ai?: { search?: boolean } }` 后通过。
- GREEN: 5 passed（生成+存储、删除、工作区批量、guard 跳过、reset 删后重生成）。

## Tests
- `apps/server/src/core/ai/processors/ai-queue.processor.spec.ts` — 5 passed
  - GENERATE_PAGE_EMBEDDINGS generates + stores embeddings for the pages
  - DELETE_PAGE_EMBEDDINGS deletes embeddings for the pages
  - WORKSPACE_CREATE_EMBEDDINGS iterates all pages in the workspace
  - skips embedding generation when AI search is disabled for the workspace
  - WORKSPACE_RESET_EMBEDDINGS deletes then regenerates

## Verification
- `pnpm --filter server exec jest ai-queue.processor.spec.ts` → 5 passed.

## Known limits
- 真实 embedding 调用需可用 LLM embedding 端点 + key（运行环境配置）；`fetchWorkspacePageIds` 用原始 SQL 分页遍历。
- 仅 OpenAI 兼容驱动 embedding；处理器对 gemini/ollama 未特殊处理（沿用 EmbeddingService 约定）。
