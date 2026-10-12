# Task 3 — page-embedding-repo

## Status: done
## Evidence: exercised

## What was done
- 新建 `apps/server/src/database/repos/page-embedding/page-embedding.repo.ts`：`@Injectable() PageEmbeddingRepo`（`@InjectKysely`），方法：
  - `insertEmbeddings(rows)`：`insertInto('pageEmbeddings').values(...)`，embedding 用 `sql\`${sql.raw(toVectorLiteral(v))}::vector\`` 注入向量字面量（kysely 构建器表名用 camelCase 接口键 `pageEmbeddings`，由 CamelCasePlugin 映射 `page_embeddings`）。
  - `deleteByPageIds(pageIds)` / `deleteByWorkspace(workspaceId)`。
  - `vectorSearch(workspaceId, queryVec, {limit, spaceId})`：手动构造 `executeQuery` 所需的 `{ sql, parameters }`（避免依赖真实 executor 做 compile），SQL 用 `embedding <=> $2::vector` 余弦距离 + `workspace_id`/`deleted_at`/`space_id` 过滤。
  - 导出 `toVectorLiteral(vec)` 辅助（生成 `'[...]'` 字面量）。

## TDD
- RED: `page-embedding.repo.spec.ts` 先写，运行因模块不存在而 FAIL（TS2307）。
- GREEN: 实现后 6 passed。期间修正：(1) kysely 表名须用接口键 `pageEmbeddings`（非 `page_embeddings`）；(2) `vectorSearch` 改用 `executeQuery({sql,parameters})` 而非 `query.compile(this.db)`（mock 无 executor 会抛错）。

## Tests
- `apps/server/src/database/repos/page-embedding/page-embedding.repo.spec.ts` — 6 passed
  - toVectorLiteral formats a pgvector literal
  - vectorSearch builds a pgvector distance query filtered by workspace
  - vectorSearch adds a space filter when spaceId is provided
  - insertEmbeddings inserts into page_embeddings with a vector literal
  - deleteByPageIds deletes rows for the given page ids
  - deleteByWorkspace deletes all rows for the workspace

## Verification
- `pnpm --filter server exec jest page-embedding.repo.spec.ts` → 6 passed.

## Known limits
- vectorSearch 的真实执行依赖 pgvector 与 HNSW 索引（由迁移 Task 1 创建）；单测仅验证 SQL 构造正确。
