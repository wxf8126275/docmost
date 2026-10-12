# Task 5 — module-wiring

## Status: done
## Evidence: exercised

## What was done
- 新建 `apps/server/src/core/ai/ai.module.ts`：`@Module({ imports: [WorkspaceModule], providers: [EmbeddingService, PageEmbeddingRepo, AiQueueProcessor], exports: [EmbeddingService, PageEmbeddingRepo] })`。
  - `WorkspaceModule` 提供 `WorkspaceService`（`AiQueueProcessor` 需读取 workspace 设置与页面列表）。
  - `EmbeddingService` / `PageEmbeddingRepo` 导出供 `SearchService`（Task 6）注入使用。
  - AI_QUEUE 在全局 `QueueModule` 中注册，`@Processor(QueueName.AI_QUEUE)` 的 `AiQueueProcessor` 随本模块加载自动启动 worker。
- `apps/server/src/core/core.module.ts` 的 `imports` 数组加入 `AiModule`（在 `AiChatModule` 之后）。
- 修改 `apps/server/src/integrations/environment/environment.validation.ts`：当 `AI_VECTOR_DRIVER === 'pgvector'` 时，`AI_EMBEDDING_MODEL` 与 `AI_EMBEDDING_DIMENSION` 改为 `@ValidateIf(... === 'pgvector') @IsNotEmpty()`，强制必填以约束 `vector(<dim>)` 列与 provider 维度一致。

## TDD
- 非纯测试任务（装配 + 校验），以 `tsc --noEmit` + 既有测试回归验证。
- 无新增 spec；依赖 Task 2/3/4 的 14 个单测 + `workspace.service.spec.ts` 4 个单测（共 18 passed）覆盖注入与装配路径。

## Tests
- 既有回归：`workspace.service.spec.ts` 4 passed（license/设置查询走 `db` mock，不受 `page_embeddings` 影响）。
- 关联：embedding.service(3) + page-embedding.repo(6) + ai-queue.processor(5) 共 14 passed。
- 总：`pnpm --filter server exec jest embedding.service page-embedding.repo ai-queue.processor workspace.service --runInBand` → 4 suites, 18 passed。

## Verification
- `pnpm --filter server exec tsc --noEmit` → 无输出（通过）。
- 全量 4 套件 18 测试全绿，无回归。

## Known limits
- `WorkspaceModule` 已包含 `PageModule` 等依赖，确保 `AiQueueProcessor` 注入 `PageRepo` 可用。
- pgvector 下 `AI_EMBEDDING_DIMENSION` 取值范围限定为 `768/1024/1536/2000/3072`，与迁移列创建时读取的同一变量保持一致。
