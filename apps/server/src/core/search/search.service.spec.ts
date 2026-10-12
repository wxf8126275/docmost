import { SearchService } from './search.service';
import { SearchDTO } from './dto/search.dto';

function createDbChain(): any {
  const chain: any = {};
  const chainableMethods = [
    'selectFrom',
    'select',
    'where',
    'whereRef',
    '$if',
    'orderBy',
    'limit',
    'offset',
    'from',
    'innerJoin',
    'leftJoin',
    'groupBy',
    'having',
    'with',
    'returning',
  ];
  chainableMethods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.execute = jest.fn();
  chain.executeTakeFirst = jest.fn();
  chain.compile = jest.fn();
  return chain;
}

describe('SearchService (semantic / pgvector)', () => {
  let service: SearchService;
  let db: any;
  let pageRepo: any;
  let shareRepo: any;
  let spaceMemberRepo: any;
  let pagePermissionRepo: any;
  let embeddingService: any;
  let pageEmbeddingRepo: any;
  let workspaceService: any;
  let environmentService: any;

  beforeEach(() => {
    db = createDbChain();
    pageRepo = {
      withSpace: jest.fn(),
      getPageAndDescendantsExcludingRestricted: jest.fn(),
    };
    shareRepo = { findById: jest.fn() };
    spaceMemberRepo = {
      getUserSpaceIdsQuery: jest.fn().mockReturnValue('space-ids-subquery'),
      getUserSpaceIds: jest.fn().mockResolvedValue([]),
    };
    pagePermissionRepo = {
      filterAccessiblePageIds: jest
        .fn()
        .mockImplementation(async (args: any) => args.pageIds),
      hasRestrictedAncestor: jest.fn(),
    };
    embeddingService = { embed: jest.fn() };
    pageEmbeddingRepo = { vectorSearch: jest.fn() };
    workspaceService = { findById: jest.fn() };
    environmentService = {
      getAiVectorDriver: jest.fn().mockReturnValue('pgvector'),
    };

    service = new SearchService(
      db,
      pageRepo,
      shareRepo,
      spaceMemberRepo,
      pagePermissionRepo,
      embeddingService,
      pageEmbeddingRepo,
      workspaceService,
      environmentService,
    );
  });

  const baseOpts = { userId: 'u1', workspaceId: 'ws1' };
  const pageRow = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    slugId: `s-${id}`,
    title: id,
    icon: '',
    parentPageId: null,
    creatorId: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  });

  it('uses semantic search when aiSearch is requested and workspace ai.search enabled', async () => {
    workspaceService.findById.mockResolvedValue({
      settings: { ai: { search: true } },
    });
    embeddingService.embed.mockResolvedValue([[0.1, 0.2, 0.3]]);
    pageEmbeddingRepo.vectorSearch.mockResolvedValue([
      { pageId: 'p1', distance: 0.1 },
      { pageId: 'p2', distance: 0.4 },
    ]);
    db.execute
      .mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }]) // semantic id query
      .mockResolvedValueOnce([pageRow('p1'), pageRow('p2')]) // semantic rows query
      .mockResolvedValueOnce([]) // full-text results (top-up)
      .mockResolvedValueOnce([]); // full-text highlights (top-up)

    const res = await service.searchPage(
      { query: 'hello world', aiSearch: true, limit: 10 } as SearchDTO,
      baseOpts,
    );

    expect(embeddingService.embed).toHaveBeenCalledWith(['hello world']);
    expect(pageEmbeddingRepo.vectorSearch).toHaveBeenCalledTimes(1);
    expect(res.items).toHaveLength(2);
    // most similar (smallest distance) ranks first
    expect(res.items[0].id).toBe('p1');
    expect(res.items[0].rank).toBeGreaterThan(res.items[1].rank);
  });

  it('does not call embed when workspace ai.search is disabled', async () => {
    workspaceService.findById.mockResolvedValue({
      settings: { ai: { search: false } },
    });
    db.execute.mockResolvedValue([]);

    const res = await service.searchPage(
      { query: 'hello', aiSearch: true, limit: 10 } as SearchDTO,
      baseOpts,
    );

    expect(embeddingService.embed).not.toHaveBeenCalled();
    expect(pageEmbeddingRepo.vectorSearch).not.toHaveBeenCalled();
    expect(res.items).toEqual([]);
  });

  it('does not call embed when aiSearch is not requested (full-text path)', async () => {
    db.execute.mockResolvedValue([]);

    const res = await service.searchPage(
      { query: 'hello', limit: 10 } as SearchDTO,
      baseOpts,
    );

    expect(embeddingService.embed).not.toHaveBeenCalled();
    expect(pageEmbeddingRepo.vectorSearch).not.toHaveBeenCalled();
    expect(res.items).toEqual([]);
  });

  it('falls back to full-text when semantic search returns no hits', async () => {
    workspaceService.findById.mockResolvedValue({
      settings: { ai: { search: true } },
    });
    embeddingService.embed.mockResolvedValue([[0.1, 0.2]]);
    pageEmbeddingRepo.vectorSearch.mockResolvedValue([]);
    db.execute
      .mockResolvedValueOnce([pageRow('p2', { rank: 0.9 })]) // full-text results
      .mockResolvedValueOnce([]); // full-text highlights

    const res = await service.searchPage(
      { query: 'hello', aiSearch: true, limit: 10 } as SearchDTO,
      baseOpts,
    );

    expect(embeddingService.embed).toHaveBeenCalled();
    expect(res.items).toHaveLength(1);
    expect(res.items[0].id).toBe('p2');
  });

  it('tops up semantic results with full-text matches when under the limit', async () => {
    workspaceService.findById.mockResolvedValue({
      settings: { ai: { search: true } },
    });
    embeddingService.embed.mockResolvedValue([[0.1, 0.2]]);
    pageEmbeddingRepo.vectorSearch.mockResolvedValue([
      { pageId: 'p1', distance: 0.1 },
    ]);
    db.execute
      .mockResolvedValueOnce([{ id: 'p1' }]) // semantic id query
      .mockResolvedValueOnce([pageRow('p1')]) // semantic rows query
      .mockResolvedValueOnce([pageRow('p2', { rank: 0.9 })]) // full-text results
      .mockResolvedValueOnce([]); // full-text highlights

    const res = await service.searchPage(
      { query: 'hello', aiSearch: true, limit: 10 } as SearchDTO,
      baseOpts,
    );

    expect(res.items).toHaveLength(2);
    const ids = res.items.map((i) => i.id);
    expect(ids).toContain('p1');
    expect(ids).toContain('p2');
  });
});
