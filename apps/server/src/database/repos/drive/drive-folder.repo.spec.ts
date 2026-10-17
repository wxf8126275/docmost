import { DriveFolderRepo } from './drive-folder.repo';
import { DriveFolder } from '@docmost/db/types/entity.types';

function makeDbMock() {
  const calls: { lastResult: unknown } = { lastResult: [] };
  const chain: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        switch (prop) {
          case 'executeTakeFirst':
          case 'execute':
            return async () => calls.lastResult;
          case 'executeTakeFirstOrThrow':
            return async () => {
              if (calls.lastResult == null) throw new Error('not found');
              return calls.lastResult;
            };
          default:
            return () => chain;
        }
      },
    },
  );
  return { db: chain, calls };
}

describe('DriveFolderRepo', () => {
  let repo: DriveFolderRepo;
  let dbMock: ReturnType<typeof makeDbMock>;

  beforeEach(() => {
    dbMock = makeDbMock();
    repo = new DriveFolderRepo(dbMock.db);
  });

  const folder: DriveFolder = {
    id: 'f1',
    workspaceId: 'w1',
    driveType: 'personal',
    ownerId: 'u1',
    parentId: null,
    name: 'Docs',
    creatorId: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  it('createFolder inserts and returns the row', async () => {
    dbMock.calls.lastResult = folder;
    const result = await repo.createFolder({
      workspaceId: 'w1',
      driveType: 'personal',
      ownerId: 'u1',
      parentId: null,
      name: 'Docs',
      creatorId: 'u1',
    });
    expect(result).toEqual(folder);
  });

  it('findById returns the row', async () => {
    dbMock.calls.lastResult = folder;
    const result = await repo.findById('f1');
    expect(result).toEqual(folder);
  });

  it('updateFolder returns the updated row', async () => {
    const updated = { ...folder, name: 'Renamed' };
    dbMock.calls.lastResult = updated;
    const result = await repo.updateFolder({ name: 'Renamed' }, 'f1');
    expect(result.name).toBe('Renamed');
  });

  it('softDeleteFolder resolves without throwing', async () => {
    dbMock.calls.lastResult = { ...folder, deletedAt: new Date() };
    await expect(repo.softDeleteFolder('f1')).resolves.toBeUndefined();
  });

  it('listFolders returns an array of folders', async () => {
    dbMock.calls.lastResult = [folder];
    const result = await repo.listFolders({
      workspaceId: 'w1',
      driveType: 'personal',
      ownerId: 'u1',
      parentId: null,
    });
    expect(result).toHaveLength(1);
  });
});
