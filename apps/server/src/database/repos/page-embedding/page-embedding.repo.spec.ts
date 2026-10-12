import { PageEmbeddingRepo, toVectorLiteral } from './page-embedding.repo';

describe('PageEmbeddingRepo', () => {
  let repo: PageEmbeddingRepo;
  let db: any;

  beforeEach(() => {
    db = {
      executeQuery: jest.fn().mockResolvedValue({ rows: [] }),
      insertInto: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({ execute: jest.fn().mockResolvedValue({}) }),
      }),
      deleteFrom: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ execute: jest.fn().mockResolvedValue({}) }),
      }),
    };
    repo = new PageEmbeddingRepo(db);
  });

  it('toVectorLiteral formats a pgvector literal', () => {
    expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
    expect(toVectorLiteral([])).toBe('[]');
  });

  it('vectorSearch builds a pgvector distance query filtered by workspace', async () => {
    db.executeQuery.mockResolvedValue({
      rows: [
        { pageId: 'p1', distance: 0.2 },
        { pageId: 'p2', distance: 0.5 },
      ],
    });
    const rows = await repo.vectorSearch('ws-1', [0.1, 0.2], { limit: 10 });

    expect(db.executeQuery).toHaveBeenCalledTimes(1);
    const compiled = db.executeQuery.mock.calls[0][0];
    expect(compiled.sql).toContain('<=>');
    expect(compiled.sql).toContain('embedding');
    expect(compiled.sql).toContain('workspace_id');
    expect(compiled.sql).toContain('deleted_at');
    expect(rows).toEqual([
      { pageId: 'p1', distance: 0.2 },
      { pageId: 'p2', distance: 0.5 },
    ]);
  });

  it('vectorSearch adds a space filter when spaceId is provided', async () => {
    await repo.vectorSearch('ws-1', [0.1, 0.2], { limit: 5, spaceId: 'sp-1' });
    const compiled = db.executeQuery.mock.calls[0][0];
    expect(compiled.sql).toContain('space_id');
  });

  it('insertEmbeddings inserts into page_embeddings with a vector literal', async () => {
    await repo.insertEmbeddings([
      {
        pageId: 'p1',
        spaceId: 'sp1',
        workspaceId: 'ws1',
        modelName: 'text-embedding-3-small',
        modelDimensions: 1536,
        embedding: [0.1, 0.2, 0.3],
        chunkIndex: 0,
        chunkStart: 0,
        chunkLength: 3,
      },
    ]);

    expect(db.insertInto).toHaveBeenCalledWith('pageEmbeddings');
    const values = db.insertInto().values.mock.calls[0][0];
    expect(Array.isArray(values)).toBe(true);
    expect(values[0].pageId).toBe('p1');
    // embedding must be a raw vector literal, not an array
    expect(values[0].embedding).toBeDefined();
    expect(Array.isArray(values[0].embedding)).toBe(false);
  });

  it('deleteByPageIds deletes rows for the given page ids', async () => {
    await repo.deleteByPageIds(['p1', 'p2']);
    expect(db.deleteFrom).toHaveBeenCalledWith('pageEmbeddings');
    expect(db.deleteFrom().where).toHaveBeenCalled();
  });

  it('deleteByWorkspace deletes all rows for the workspace', async () => {
    await repo.deleteByWorkspace('ws-1');
    expect(db.deleteFrom).toHaveBeenCalledWith('pageEmbeddings');
  });
});
