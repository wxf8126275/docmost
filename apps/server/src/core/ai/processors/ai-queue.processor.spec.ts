import { AiQueueProcessor } from './ai-queue.processor';
import { QueueJob } from '../../../integrations/queue/constants/queue.constants';

function makeProcessor(deps: any): AiQueueProcessor {
  return new AiQueueProcessor(
    deps.db,
    deps.pageRepo,
    deps.pageEmbeddingRepo,
    deps.embeddingService,
    deps.aiProviderService,
    deps.workspaceService,
    deps.environmentService,
  );
}

describe('AiQueueProcessor', () => {
  let db: any;
  let pageRepo: any;
  let pageEmbeddingRepo: any;
  let embeddingService: any;
  let aiProviderService: any;
  let workspaceService: any;
  let environmentService: any;

  beforeEach(() => {
    db = { executeQuery: jest.fn() };
    pageRepo = { findManyByIds: jest.fn().mockResolvedValue([]) };
    pageEmbeddingRepo = {
      insertEmbeddings: jest.fn().mockResolvedValue(undefined),
      deleteByPageIds: jest.fn().mockResolvedValue(undefined),
      deleteByWorkspace: jest.fn().mockResolvedValue(undefined),
    };
    embeddingService = { embed: jest.fn().mockResolvedValue([[0.1, 0.2]]) };
    aiProviderService = {
      getActiveProviderConfig: jest.fn().mockResolvedValue({
        driver: 'openai',
        apiKey: '',
        baseUrl: undefined,
        completionModel: 'gpt-4o-mini',
        embeddingModel: 'text-embedding-3-small',
      }),
    };
    workspaceService = { findById: jest.fn() };
    environmentService = {
      getAiEmbeddingModel: jest.fn().mockReturnValue('text-embedding-3-small'),
      getAiEmbeddingDimension: jest.fn().mockReturnValue(1536),
    };
  });

  it('GENERATE_PAGE_EMBEDDINGS generates + stores embeddings for the pages', async () => {
    workspaceService.findById.mockResolvedValue({ settings: { ai: { search: true } } });
    pageRepo.findManyByIds.mockResolvedValue([
      { id: 'p1', spaceId: 's1', workspaceId: 'w1', textContent: 'hello world' },
    ]);
    const processor = makeProcessor({
      db,
      pageRepo,
      pageEmbeddingRepo,
      embeddingService,
      aiProviderService,
      workspaceService,
      environmentService,
    });

    await processor.process({
      name: QueueJob.GENERATE_PAGE_EMBEDDINGS,
      data: { workspaceId: 'w1', pageIds: ['p1'] },
    } as any);

    expect(pageRepo.findManyByIds).toHaveBeenCalledWith(['p1'], { workspaceId: 'w1' });
    expect(embeddingService.embed.mock.calls[0][0]).toEqual(['hello world']);
    expect(embeddingService.embed.mock.calls[0][1]).toMatchObject({
      embeddingModel: 'text-embedding-3-small',
    });
    expect(pageEmbeddingRepo.insertEmbeddings).toHaveBeenCalledTimes(1);
    const rows = pageEmbeddingRepo.insertEmbeddings.mock.calls[0][0];
    expect(rows[0].pageId).toBe('p1');
    expect(rows[0].embedding).toEqual([0.1, 0.2]);
  });

  it('DELETE_PAGE_EMBEDDINGS deletes embeddings for the pages', async () => {
    const processor = makeProcessor({
      db,
      pageRepo,
      pageEmbeddingRepo,
      embeddingService,
      aiProviderService,
      workspaceService,
      environmentService,
    });
    await processor.process({
      name: QueueJob.DELETE_PAGE_EMBEDDINGS,
      data: { workspaceId: 'w1', pageIds: ['p1', 'p2'] },
    } as any);

    expect(pageEmbeddingRepo.deleteByPageIds).toHaveBeenCalledWith(['p1', 'p2']);
    expect(embeddingService.embed).not.toHaveBeenCalled();
  });

  it('WORKSPACE_CREATE_EMBEDDINGS iterates all pages in the workspace', async () => {
    workspaceService.findById.mockResolvedValue({ settings: { ai: { search: true } } });
    pageRepo.findManyByIds.mockResolvedValue([
      { id: 'p1', spaceId: 's1', workspaceId: 'w1', textContent: 'content one' },
    ]);
    db.executeQuery
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const processor = makeProcessor({
      db,
      pageRepo,
      pageEmbeddingRepo,
      embeddingService,
      aiProviderService,
      workspaceService,
      environmentService,
    });
    await processor.process({
      name: QueueJob.WORKSPACE_CREATE_EMBEDDINGS,
      data: { workspaceId: 'w1' },
    } as any);

    expect(db.executeQuery).toHaveBeenCalled();
    expect(pageRepo.findManyByIds).toHaveBeenCalledWith(['p1'], { workspaceId: 'w1' });
    expect(embeddingService.embed).toHaveBeenCalled();
  });

  it('skips embedding generation when AI search is disabled for the workspace', async () => {
    workspaceService.findById.mockResolvedValue({ settings: { ai: { search: false } } });
    const processor = makeProcessor({
      db,
      pageRepo,
      pageEmbeddingRepo,
      embeddingService,
      aiProviderService,
      workspaceService,
      environmentService,
    });
    await processor.process({
      name: QueueJob.GENERATE_PAGE_EMBEDDINGS,
      data: { workspaceId: 'w1', pageIds: ['p1'] },
    } as any);

    expect(embeddingService.embed).not.toHaveBeenCalled();
    expect(pageRepo.findManyByIds).not.toHaveBeenCalled();
  });

  it('WORKSPACE_RESET_EMBEDDINGS deletes then regenerates', async () => {
    workspaceService.findById.mockResolvedValue({ settings: { ai: { search: true } } });
    pageRepo.findManyByIds.mockResolvedValue([
      { id: 'p1', spaceId: 's1', workspaceId: 'w1', textContent: 'content' },
    ]);
    db.executeQuery
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const processor = makeProcessor({
      db,
      pageRepo,
      pageEmbeddingRepo,
      embeddingService,
      aiProviderService,
      workspaceService,
      environmentService,
    });
    await processor.process({
      name: QueueJob.WORKSPACE_RESET_EMBEDDINGS,
      data: { workspaceId: 'w1' },
    } as any);

    expect(pageEmbeddingRepo.deleteByWorkspace).toHaveBeenCalledWith('w1');
    expect(embeddingService.embed).toHaveBeenCalled();
  });
});
