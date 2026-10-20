import { DriveFileRepo } from './drive-file.repo';

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
  chain.executeTakeFirst = jest.fn().mockResolvedValue({ total: 0 });
  return { db: chain, calls };
}

const hasWhere = (calls: unknown[], col: string, value: unknown) =>
  calls.some(
    (c: any) => c[0] === 'where' && c[1] === col && c[2] === '=' && c[3] === value,
  );

describe('DriveFileRepo (space-scoped)', () => {
  let repo: DriveFileRepo;

  beforeEach(() => {
    repo = new DriveFileRepo(makeDb().db as any);
  });

  it('listFiles filters by spaceId and never by driveType/ownerId', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFileRepo(db as any);

    await repo.listFiles({ workspaceId: 'w1', spaceId: 'sp1', folderId: null });

    expect(calls.some((c: any) => c[0] === 'selectFrom' && c[1] === 'driveFiles')).toBe(true);
    expect(hasWhere(calls, 'workspaceId', 'w1')).toBe(true);
    expect(hasWhere(calls, 'spaceId', 'sp1')).toBe(true);
    expect(hasWhere(calls, 'driveType', 'personal')).toBe(false);
    expect(hasWhere(calls, 'driveType', 'shared')).toBe(false);
    expect(hasWhere(calls, 'ownerId', 'u1')).toBe(false);
  });

  it('createFile inserts spaceId', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFileRepo(db as any);

    await repo.createFile({
      workspaceId: 'w1',
      spaceId: 'sp1',
      folderId: null,
      fileName: 'a.png',
      filePath: 'p',
      fileExt: 'png',
      creatorId: 'u1',
    } as any);

    const valuesCall = calls.find((c: any) => c[0] === 'values');
    expect(valuesCall[1]).toEqual(
      expect.objectContaining({ workspaceId: 'w1', spaceId: 'sp1', fileName: 'a.png' }),
    );
    expect(valuesCall[1].driveType).toBeUndefined();
    expect(valuesCall[1].ownerId).toBeUndefined();
  });

  it('sumFileSizes aggregates by spaceId only', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFileRepo(db as any);

    const total = await repo.sumFileSizes({ spaceId: 'sp1' });

    expect(hasWhere(calls, 'spaceId', 'sp1')).toBe(true);
    expect(hasWhere(calls, 'driveType', 'personal')).toBe(false);
    expect(hasWhere(calls, 'ownerId', 'u1')).toBe(false);
    expect(total).toBe(0);
  });

  it('updateFile scopes the update by spaceId', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFileRepo(db as any);

    await repo.updateFile({ fileName: 'N' }, 'fi', 'sp1');

    expect(hasWhere(calls, 'id', 'fi')).toBe(true);
    expect(hasWhere(calls, 'spaceId', 'sp1')).toBe(true);
  });

  it('softDeleteFile scopes the delete by spaceId', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFileRepo(db as any);

    await repo.softDeleteFile('fi', 'sp1');

    expect(hasWhere(calls, 'id', 'fi')).toBe(true);
    expect(hasWhere(calls, 'spaceId', 'sp1')).toBe(true);
  });

  it('findById scopes by spaceId when provided', async () => {
    const { db, calls } = makeDb();
    repo = new DriveFileRepo(db as any);

    await repo.findById('fi', { spaceId: 'sp1' });

    expect(hasWhere(calls, 'id', 'fi')).toBe(true);
    expect(hasWhere(calls, 'spaceId', 'sp1')).toBe(true);
  });
});
