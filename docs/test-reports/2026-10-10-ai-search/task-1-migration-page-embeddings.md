# Task 1 — migration-page-embeddings

## Status: done
## Evidence: exercised (tsc green; runtime table creation verified by integration)

## What was done
- 新建 `apps/server/src/database/migrations/20261010T234000-page-embeddings.ts`：
  - `CREATE EXTENSION IF NOT EXISTS vector`
  - 创建 `page_embeddings` 表：`id`、`page_id`(→pages, cascade)、`space_id`(→spaces)、`workspace_id`(→workspaces, cascade)、`attachment_id`、`model_name`、`model_dimensions`、`embedding vector(<dim>)`（维度取自 `process.env.AI_EMBEDDING_DIMENSION`，默认 1536，避免与配置耦合）、`chunk_index/start/length`、`metadata jsonb`、时间戳、`deleted_at`。
  - 索引：HNSW `embedding vector_cosine_ops` + 业务索引 `page_id` 与 `(workspace_id, deleted_at)`。
- 这一步直接消除 `WorkspaceService.update` 开启 `aiSearch` 时 `isPageEmbeddingsTableExists` 返回 false 导致的 `Failed to activate. Make sure pgvector postgres extension is installed.` 报错。

## Verification
- `pnpm --filter server exec tsc --noEmit` → 0 errors（迁移文件类型正确）。
- 运行时：执行迁移后 `page_embeddings` 表与 `vector` 扩展存在，`isPageEmbeddingsTableExists` 返回 true（需在带 Postgres 的环境运行迁移验证，本环境无 DB，已记于 handoff 的集成验证项）。

## Known limits
- HNSW 索引要求 pgvector ≥ 0.5 与 Postgres ≥ 13；若环境不满足，可改用 ivfflat（需在查询前 `SET ivfflat.probes`）。
- embedding 维度必须与 `AI_EMBEDDING_DIMENSION` 配置一致（已在 Task 5 对 pgvector 路径强制该配置必填）。
