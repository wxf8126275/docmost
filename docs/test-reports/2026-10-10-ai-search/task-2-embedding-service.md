# Task 2 — embedding-service

## Status: done
## Evidence: exercised

## What was done
- 新建 `apps/server/src/core/ai/embedding/chunk.util.ts`：`chunkText(text, {maxChunkChars=2000, overlap=200})`，按字符分块并尽量在空白边界断开（无空白则硬切），返回 `{text,start,length}` 供 embedding 与 `page_embeddings` 的 chunk 元数据使用。
- 新建 `apps/server/src/core/ai/services/embedding.service.ts`：`@Injectable() EmbeddingService.embed(texts)`，复用 OpenAI 兼容 provider 装配（`createOpenAI({apiKey, baseURL})`）+ `ai` 的 `embedMany`，模型取自 `getAiEmbeddingModel()`；`ai`/`@ai-sdk/openai` 通过动态 `import` 懒加载，便于 jest（CommonJS）单测 mock。

## TDD
- RED: 先写 `embedding.service.spec.ts`（mock `ai`/`@ai-sdk/openai` 的 `embedMany`/`createOpenAI`），运行因模块不存在而 FAIL（TS2307）。
- GREEN: 实现后 3 passed（embed 返回每个文本对应向量；chunkText 短文本单块、长文本重叠分块且每块 ≤ maxChunkChars）。

## Tests
- `apps/server/src/core/ai/services/embedding.service.spec.ts` — 3 passed
  - embed() returns one vector array per input text
  - chunkText() returns a single chunk for short text
  - chunkText() splits long text into overlapping chunks

## Verification
- `pnpm --filter server exec jest embedding.service.spec.ts` → 3 passed.

## Known limits
- 仅支持 OpenAI 兼容驱动的 embedding（gemini/ollama 留待后续）；模型维度须与 `AI_EMBEDDING_DIMENSION` 配置一致（由迁移列 `vector(<dim>)` 约束）。
