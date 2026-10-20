import { DriveFolderRepo } from './drive-folder.repo';

/**
 * Behavioral spec with a recording Kysely mock: captures the query-builder
 * calls so we can assert the space scoping of every where/values clause
 * without a live database.
 */
function makeDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  const rec =
    (name: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      calls.push([name, ...args]);
      return chain;
    };
  chain.selectFrom = rec('selectFrom');
  chain.select = rec('select');
  chain.selectAll = rec('selectAll');
  chain.where = rec('where');
  chain.orderBy = rec('orderBy');
  chain.returning = rec('returning');
  chain.values = rec('values');
  chain.set = rec('set');
  chain.insertInto = rec('insertInto');
  chain.updateTable = rec('updateTable');
  chain.execute = jest.fn().mockResolvedValue([]);
  chain.executeTakeFirst = jest.fn().mockResolvedValue(undefined);
  return { db: chain, calls };
}

const hasWhere = (calls: unknown[], col: string, value: unknown) =>
  calls.some(
    (c: any) => c[0] === 'where' && c[1] === col && c[2] === '=' && c[3] === value,
  );

describe('DriveFolderRepo (space-scoped)', () => {
  let repo: DriveFolderRepo;

  beforeEach(() => {
    repo = new DriveFolderRepo(makeDb().db as any);
  });

  it('listFolders filters by spaceId and never by driveType/ownerId', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFolderRepo(db as any);

    await repo.listFolders({ workspaceId: 'w1', spaceId: 'sp1', parentId: null });

    expect(calls.some((c: any) => c[0] === 'selectFrom' && c[1] === 'driveFolders')).toBe(true);
    expect(hasWhere(calls, 'workspaceId', 'w1')).toBe(true);
    expect(hasWhere(calls, 'spaceId', 'sp1')).toBe(true);
    expect(hasWhere(calls, 'driveType', 'personal')).toBe(false);
    expect(hasWhere(calls, 'driveType', 'shared')).toBe(false);
    expect(hasWhere(calls, 'ownerId', 'u1')).toBe(false);
    expect(calls.some((c: any) => c[0] === 'where' && c[1] === 'parentId' && c[2] === 'is')).toBe(true);
  });

  it('createFolder inserts spaceId', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFolderRepo(db as any);

    await repo.createFolder({
      workspaceId: 'w1',
      spaceId: 'sp1',
      parentId: null,
      name: 'X',
      creatorId: 'u1',
    } as any);

    const valuesCall = calls.find((c: any) => c[0] === 'values');
    expect(valuesCall[1]).toEqual(
      expect.objectContaining({ workspaceId: 'w1', spaceId: 'sp1', name: 'X' }),
    );
    expect(valuesCall[1].driveType).toBeUndefined();
    expect(valuesCall[1].ownerId).toBeUndefined();
  });

  it('updateFolder scopes the update by spaceId', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFolderRepo(db as any);

    await repo.updateFolder({ name: 'N' }, 'f1', 'sp1');

    expect(hasWhere(calls, 'id', 'f1')).toBe(true);
    expect(hasWhere(calls, 'spaceId', 'sp1')).toBe(true);
  });

  it('softDeleteFolder scopes the delete by spaceId', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFolderRepo(db as any);

    await repo.softDeleteFolder('f1', 'sp1');

    expect(hasWhere(calls, 'id', 'f1')).toBe(true);
    expect(hasWhere(calls, 'spaceId', 'sp1')).toBe(true);
  });

  it('findById scopes by spaceId when provided', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFolderRepo(db as any);

    await repo.findById('f1', { spaceId: 'sp1' });

    expect(hasWhere(calls, 'id', 'f1')).toBe(true);
    expect(hasWhere(calls, 'spaceId', 'sp1')).toBe(true);
  });
});
