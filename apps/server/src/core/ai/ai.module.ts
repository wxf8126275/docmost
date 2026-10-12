import { Module } from '@nestjs/common';
import { WorkspaceModule } from '../workspace/workspace.module';
import { EmbeddingService } from './services/embedding.service';
import { PageEmbeddingRepo } from '@docmost/db/repos/page-embedding/page-embedding.repo';
import { AiQueueProcessor } from './processors/ai-queue.processor';

/**
 * AI semantic search (pgvector) module:
 * - EmbeddingService: generates text embeddings via an OpenAI-compatible model.
 * - PageEmbeddingRepo: stores/queries page embeddings.
 * - AiQueueProcessor: consumes the AI_QUEUE jobs that create/delete embeddings.
 *
 * The AI_QUEUE itself is registered globally in QueueModule, so the processor's
 * @Processor worker starts automatically once this module is loaded.
 */
@Module({
  imports: [WorkspaceModule],
  providers: [EmbeddingService, PageEmbeddingRepo, AiQueueProcessor],
  exports: [EmbeddingService, PageEmbeddingRepo],
})
export class AiModule {}
