import { BaseService } from './base.service';

function makeMocks() {
  const trx = {
    insertInto: jest.fn(() => ({
      values: jest.fn(() => ({ execute: jest.fn(async () => {}) })),
    })),
    updateTable: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          where: jest.fn(() => ({ execute: jest.fn(async () => {}) })),
        })),
      })),
    })),
  };

  const makeChain = (rows: unknown[] = []) => {
    const obj: any = {};
    obj.where = () => makeChain(rows);
    obj.orderBy = () => makeChain(rows);
    obj.execute = jest.fn(async () => rows);
    return obj;
  };
  const selectAllChain = { selectAll: () => makeChain([]) };

  const db: any = {
    transaction: jest.fn(() => ({ execute: (fn: any) => fn(trx) })),
    selectFrom: jest.fn(() => selectAllChain),
  };

  const page = {
    id: 'page-1',
    slugId: 'abcd123456',
    title: 'My Page',
    icon: null,
    spaceId: 'space-1',
    workspaceId: 'ws-1',
    creatorId: 'user-1',
    isBase: false,
    baseSchemaVersion: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const pageRepo: any = {
    findById: jest.fn(async () => page),
  };

  const pageAccessService: any = {
    validateCanEdit: jest.fn(async () => {}),
    validateCanView: jest.fn(async () => {}),
    validateCanViewWithPermissions: jest.fn(async () => ({
      canEdit: true,
      hasRestriction: false,
    })),
  };

  const service = new BaseService(db, pageRepo, pageAccessService);
  return { service, db, trx, pageRepo, pageAccessService, page };
}

describe('BaseService.convertPageToBase', () => {
  const user: any = { id: 'user-1' };
  const workspaceId = 'ws-1';

  it('creates default schema (Name property + table view) and returns a base', async () => {
    const { service, trx } = makeMocks();
    const result: any = await service.convertPageToBase(user, workspaceId, {
      pageId: 'page-1',
    });

    expect(trx.insertInto).toHaveBeenCalledWith('baseProperties');
    expect(trx.insertInto).toHaveBeenCalledWith('baseViews');

    const propsInsert = trx.insertInto.mock.calls.find(
      (c: any[]) => c[0] === 'baseProperties',
    );
    expect(propsInsert).toBeDefined();

    expect(result.id).toBe('page-1');
    expect(result.slugId).toBe('abcd123456');
    expect(result.spaceId).toBe('space-1');
    expect(result.properties).toEqual([]); // mocked selects return none
    expect(result.views).toEqual([]);
    expect(result.baseSchemaVersion).toBe(0); // from mocked page
  });

  it('kanban template creates a view', async () => {
    const { service, trx } = makeMocks();
    await service.convertPageToBase(user, workspaceId, {
      pageId: 'page-1',
      template: 'kanban',
    });
    expect(trx.insertInto).toHaveBeenCalledWith('baseViews');
  });

  it('is idempotent when the page is already a base', async () => {
    const { service, trx, page } = makeMocks();
    page.isBase = true;
    await service.convertPageToBase(user, workspaceId, { pageId: 'page-1' });
    expect(trx.insertInto).not.toHaveBeenCalled();
  });

  it('rejects when the page is missing', async () => {
    const { service, pageRepo } = makeMocks();
    pageRepo.findById.mockResolvedValueOnce(null);
    await expect(
      service.convertPageToBase(user, workspaceId, { pageId: 'missing' }),
    ).rejects.toThrow();
  });
});
