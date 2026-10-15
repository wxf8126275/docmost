import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { QueueJob, QueueName } from '../../../integrations/queue/constants/queue.constants';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PageEmbeddingRepo } from '@docmost/db/repos/page-embedding/page-embedding.repo';
import { EmbeddingService } from '../services/embedding.service';
import { AiProviderService } from '../services/ai-provider.service';
import { WorkspaceService } from '../../workspace/services/workspace.service';
import { EnvironmentService } from '../../../integrations/environment/environment.service';
import { chunkText } from '../embedding/chunk.util';

interface EmbeddingJobData {
  workspaceId: string;
  pageIds?: string[];
}

const PAGE_BATCH_SIZE = 100;

@Processor(QueueName.AI_QUEUE)
@Injectable()
export class AiQueueProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(AiQueueProcessor.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly pageRepo: PageRepo,
    private readonly pageEmbeddingRepo: PageEmbeddingRepo,
    private readonly embeddingService: EmbeddingService,
    private readonly aiProviderService: AiProviderService,
    private readonly workspaceService: WorkspaceService,
    private readonly environmentService: EnvironmentService,
  ) {
    super();
  }

  async process(job: Job<EmbeddingJobData>): Promise<void> {
    const data = job.data ?? ({} as EmbeddingJobData);
    switch (job.name) {
      case QueueJob.GENERATE_PAGE_EMBEDDINGS:
      case QueueJob.WORKSPACE_CREATE_EMBEDDINGS:
      case QueueJob.PAGE_CREATED:
      case QueueJob.PAGE_UPDATED:
      case QueueJob.PAGE_RESTORED:
        await this.generateEmbeddings(data.workspaceId, data.pageIds);
        break;

      case QueueJob.DELETE_PAGE_EMBEDDINGS:
      case QueueJob.PAGE_DELETED:
      case QueueJob.PAGE_SOFT_DELETED:
        if (data.pageIds?.length) {
          await this.pageEmbeddingRepo.deleteByPageIds(data.pageIds);
        }
        break;

      case QueueJob.WORKSPACE_DELETE_EMBEDDINGS:
        await this.pageEmbeddingRepo.deleteByWorkspace(data.workspaceId);
        break;

      case QueueJob.WORKSPACE_RESET_EMBEDDINGS:
        await this.pageEmbeddingRepo.deleteByWorkspace(data.workspaceId);
        await this.generateEmbeddings(data.workspaceId);
        break;

      default:
        break;
    }
  }

  private async generateEmbeddings(
    workspaceId: string,
    pageIds?: string[],
  ): Promise<void> {
    const workspace = await this.workspaceService.findById(workspaceId);
    // Only generate embeddings when AI search is enabled for this workspace.
    const aiSettings = ((workspace?.settings ?? {}) as {
      ai?: { search?: boolean };
    }).ai;
    if (!aiSettings?.search) {
      return;
    }

    if (pageIds?.length) {
      await this.generateForPages(workspaceId, pageIds);
    } else {
      await this.generateForWorkspace(workspaceId);
    }
  }

  private async generateForPages(
    workspaceId: string,
    pageIds: string[],
  ): Promise<void> {
    const pages = await this.pageRepo.findManyByIds(pageIds, { workspaceId });
    await this.embedPages(workspaceId, pages);
  }

  private async generateForWorkspace(workspaceId: string): Promise<void> {
    let offset = 0;
    while (true) {
      const pageIds = await this.fetchWorkspacePageIds(
        workspaceId,
        PAGE_BATCH_SIZE,
        offset,
      );
      if (!pageIds.length) {
        break;
      }
      await this.generateForPages(workspaceId, pageIds);
      offset += PAGE_BATCH_SIZE;
      if (pageIds.length < PAGE_BATCH_SIZE) {
        break;
      }
    }
  }

  private async fetchWorkspacePageIds(
    workspaceId: string,
    limit: number,
    offset: number,
  ): Promise<string[]> {
    const { rows } = await this.db.executeQuery({
      sql: `SELECT id FROM pages WHERE workspace_id = $1 AND deleted_at IS NULL ORDER BY id LIMIT $2 OFFSET $3`,
      parameters: [workspaceId, limit, offset],
    } as never);
    return (rows as Array<{ id: string }>).map((r) => r.id);
  }

  private async embedPages(
    workspaceId: string,
    pages: Array<Record<string, any>>,
  ): Promise<void> {
    const provider =
      await this.aiProviderService.getActiveProviderConfig(workspaceId);
    const modelName =
      provider.embeddingModel ??
      this.environmentService.getAiEmbeddingModel() ??
      'text-embedding-3-small';
    const modelDimensions = this.environmentService.getAiEmbeddingDimension();

    for (const page of pages) {
      const textContent: string = page?.textContent ?? '';
      if (!textContent || !textContent.trim()) {
        continue;
      }
      const chunks = chunkText(textContent);
      if (!chunks.length) {
        continue;
      }
      const vectors = await this.embeddingService.embed(
        chunks.map((c) => c.text),
        provider,
      );
      const rows = chunks.map((chunk, index) => ({
        pageId: page.id,
        spaceId: page.spaceId,
        workspaceId: page.workspaceId,
        modelName,
        modelDimensions,
        embedding: vectors[index] ?? [],
        chunkIndex: index,
        chunkStart: chunk.start,
        chunkLength: chunk.length,
      }));
      await this.pageEmbeddingRepo.insertEmbeddings(rows);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
