import { Module } from '@nestjs/common';
import { WorkspaceModule } from '../workspace/workspace.module';
import { EmbeddingService } from './services/embedding.service';
import { AiProviderService } from './services/ai-provider.service';
import { AiProviderRepo } from './repos/ai-provider.repo';
import { AiProviderController } from './ai-provider.controller';
import { PageEmbeddingRepo } from '@docmost/db/repos/page-embedding/page-embedding.repo';
import { AiQueueProcessor } from './processors/ai-queue.processor';
import { EncryptionModule } from '../../integrations/encryption/encryption.module';

/**
 * AI semantic search (pgvector) module:
 * - EmbeddingService: generates text embeddings via an OpenAI-compatible model.
 * - AiProviderService: workspace-managed AI providers (encrypted keys, default
 *   provider resolution that overrides environment variables).
 * - AiProviderController: CRUD API for workspace AI providers.
 * - PageEmbeddingRepo: stores/queries page embeddings.
 * - AiQueueProcessor: consumes the AI_QUEUE jobs that create/delete embeddings.
 *
 * The AI_QUEUE itself is registered globally in QueueModule, so the processor's
 * @Processor worker starts automatically once this module is loaded.
 */
@Module({
  imports: [WorkspaceModule, EncryptionModule],
  controllers: [AiProviderController],
  providers: [
    EmbeddingService,
    AiProviderService,
    AiProviderRepo,
    PageEmbeddingRepo,
    AiQueueProcessor,
  ],
  exports: [EmbeddingService, AiProviderService, PageEmbeddingRepo],
})
export class AiModule {}
