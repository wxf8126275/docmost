import { DriveService } from './drive.service';
import { DriveFolderRepo } from '../../../database/repos/drive/drive-folder.repo';
import { DriveFileRepo } from '../../../database/repos/drive/drive-file.repo';
import { User } from '@docmost/db/types/entity.types';

function makeUser(id: string): User {
  return { id, role: 'member' } as unknown as User;
}

describe('DriveService', () => {
  let service: DriveService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let folderRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fileRepo: any;

  beforeEach(() => {
    folderRepo = {
      createFolder: jest.fn().mockResolvedValue({ id: 'f1' }),
      findById: jest.fn(),
      updateFolder: jest.fn().mockResolvedValue({}),
      softDeleteFolder: jest.fn().mockResolvedValue(undefined),
      listFolders: jest.fn().mockResolvedValue([]),
    };
    fileRepo = {
      createFile: jest.fn().mockResolvedValue({ id: 'file1' }),
      findById: jest.fn(),
      updateFile: jest.fn().mockResolvedValue({ id: 'file1' }),
      softDeleteFile: jest.fn().mockResolvedValue(undefined),
      listFiles: jest.fn().mockResolvedValue([]),
    };
    service = new DriveService(folderRepo, fileRepo);
  });

  describe('folders', () => {
    it('createFolder writes spaceId (no driveType/ownerId)', async () => {
      const user = makeUser('u1');

      await service.createFolder(user, 'w1', {
        spaceId: 'sp1',
        name: 'X',
        parentId: null,
      });

      const insertable = folderRepo.createFolder.mock.calls[0][0];
      expect(insertable).toEqual(
        expect.objectContaining({
          workspaceId: 'w1',
          spaceId: 'sp1',
          name: 'X',
          parentId: null,
          creatorId: 'u1',
        }),
      );
      expect(insertable.driveType).toBeUndefined();
      expect(insertable.ownerId).toBeUndefined();
    });

    it('listFolders is scoped to the given space', async () => {
      const user = makeUser('u1');
      folderRepo.listFolders.mockResolvedValue([]);

      await service.listFolders(user, 'w1', 'sp1', null);

      expect(folderRepo.listFolders).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'w1',
          spaceId: 'sp1',
          parentId: null,
        }),
      );
    });

    it('listFolders does not leak rows from another space (cross-space isolation)', async () => {
      const user = makeUser('u1');
      folderRepo.listFolders.mockImplementation(async (opts: any) =>
        opts.spaceId === 'sp1' ? [{ id: 'f1' }] : [],
      );

      const inSp1 = await service.listFolders(user, 'w1', 'sp1', null);
      const inSp2 = await service.listFolders(user, 'w1', 'sp2', null);

      expect(inSp1).toHaveLength(1);
      expect(inSp2).toHaveLength(0);
    });

    it('renameFolder is scoped to the space', async () => {
      await service.renameFolder('sp1', 'f1', 'New');
      expect(folderRepo.updateFolder).toHaveBeenCalledWith(
        { name: 'New' },
        'f1',
        'sp1',
      );
    });

    it('moveFolder delegates with the target parentId and space scope', async () => {
      await service.moveFolder('sp1', 'f1', 'f2');
      expect(folderRepo.updateFolder).toHaveBeenCalledWith(
        { parentId: 'f2' },
        'f1',
        'sp1',
      );
    });

    it('moveFolder to root sets parentId null', async () => {
      await service.moveFolder('sp1', 'f1', null);
      expect(folderRepo.updateFolder).toHaveBeenCalledWith(
        { parentId: null },
        'f1',
        'sp1',
      );
    });

    it('softDeleteFolder delegates with space scope', async () => {
      await service.softDeleteFolder('sp1', 'f1');
      expect(folderRepo.softDeleteFolder).toHaveBeenCalledWith('f1', 'sp1');
    });

    it('getBreadcrumb walks the parent chain within the space', async () => {
      const root = { id: 'r', parentId: null, spaceId: 'sp1' } as any;
      const child = { id: 'c', parentId: 'r', spaceId: 'sp1' } as any;
      folderRepo.findById.mockImplementation(async (id: string) =>
        id === 'c' ? child : root,
      );

      const crumbs = await service.getBreadcrumb('sp1', 'c');

      expect(crumbs.map((c: any) => c.id)).toEqual(['r', 'c']);
      expect(folderRepo.findById).toHaveBeenCalledWith('c', { spaceId: 'sp1' });
    });

    it('getFolder resolves within the space', async () => {
      folderRepo.findById.mockResolvedValue({ id: 'f1' });
      await service.getFolder('f1', 'sp1');
      expect(folderRepo.findById).toHaveBeenCalledWith('f1', { spaceId: 'sp1' });
    });
  });

  describe('files', () => {
    it('createFile writes spaceId (no driveType/ownerId)', async () => {
      const user = makeUser('u1');

      await service.createFile(user, 'w1', {
        spaceId: 'sp1',
        folderId: null,
        fileName: 'a.png',
        filePath: 'p',
        fileExt: 'png',
      });

      const insertable = fileRepo.createFile.mock.calls[0][0];
      expect(insertable).toEqual(
        expect.objectContaining({
          workspaceId: 'w1',
          spaceId: 'sp1',
          folderId: null,
          fileName: 'a.png',
          creatorId: 'u1',
        }),
      );
      expect(insertable.driveType).toBeUndefined();
      expect(insertable.ownerId).toBeUndefined();
    });

    it('listFiles is scoped to the given space', async () => {
      const user = makeUser('u1');

      await service.listFiles(user, 'w1', 'sp1', null);

      expect(fileRepo.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'w1',
          spaceId: 'sp1',
          folderId: null,
        }),
      );
    });

    it('listFiles does not leak rows from another space (cross-space isolation)', async () => {
      const user = makeUser('u1');
      fileRepo.listFiles.mockImplementation(async (opts: any) =>
        opts.spaceId === 'sp1' ? [{ id: 'file1' }] : [],
      );

      const inSp1 = await service.listFiles(user, 'w1', 'sp1', null);
      const inSp2 = await service.listFiles(user, 'w1', 'sp2', null);

      expect(inSp1).toHaveLength(1);
      expect(inSp2).toHaveLength(0);
    });

    it('renameFile is scoped to the space', async () => {
      await service.renameFile('sp1', 'fi', 'b.png');
      expect(fileRepo.updateFile).toHaveBeenCalledWith(
        { fileName: 'b.png' },
        'fi',
        'sp1',
      );
    });

    it('moveFile delegates with the target folderId and space scope', async () => {
      await service.moveFile('sp1', 'fi', 'f2');
      expect(fileRepo.updateFile).toHaveBeenCalledWith(
        { folderId: 'f2' },
        'fi',
        'sp1',
      );
    });

    it('softDeleteFile delegates with space scope', async () => {
      await service.softDeleteFile('sp1', 'fi');
      expect(fileRepo.softDeleteFile).toHaveBeenCalledWith('fi', 'sp1');
    });

    it('getFile resolves within the space', async () => {
      fileRepo.findById.mockResolvedValue({ id: 'fi' });
      await service.getFile('fi', 'sp1');
      expect(fileRepo.findById).toHaveBeenCalledWith('fi', { spaceId: 'sp1' });
    });
  });
});
