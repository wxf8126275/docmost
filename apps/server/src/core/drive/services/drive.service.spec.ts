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
      createFolder: jest.fn(),
      findById: jest.fn(),
      updateFolder: jest.fn(),
      softDeleteFolder: jest.fn(),
      listFolders: jest.fn(),
    };
    fileRepo = {
      createFile: jest.fn(),
      findById: jest.fn(),
      updateFile: jest.fn(),
      softDeleteFile: jest.fn(),
      listFiles: jest.fn(),
    };
    service = new DriveService(folderRepo, fileRepo);
  });

  describe('folders', () => {
    it('createFolder (personal) forces ownerId to the auth user', async () => {
      const user = makeUser('u1');
      folderRepo.createFolder.mockResolvedValue({});

      await service.createFolder(user, 'w1', {
        driveType: 'personal',
        name: 'X',
        parentId: null,
        ownerId: 'u2',
      });

      expect(folderRepo.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'w1',
          driveType: 'personal',
          ownerId: 'u1',
          creatorId: 'u1',
          name: 'X',
          parentId: null,
        }),
      );
    });

    it('createFolder (shared) sets ownerId to null', async () => {
      const user = makeUser('u1');
      folderRepo.createFolder.mockResolvedValue({});

      await service.createFolder(user, 'w1', {
        driveType: 'shared',
        name: 'Team',
      });

      expect(folderRepo.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: null, driveType: 'shared' }),
      );
    });

    it('listFolders (personal) is scoped to the auth user as owner', async () => {
      const user = makeUser('u1');
      folderRepo.listFolders.mockResolvedValue([]);

      await service.listFolders(user, 'w1', 'personal', null);

      expect(folderRepo.listFolders).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'w1',
          driveType: 'personal',
          ownerId: 'u1',
          parentId: null,
        }),
      );
    });

    it('renameFolder delegates to repo updateFolder with the new name', async () => {
      folderRepo.updateFolder.mockResolvedValue({});
      await service.renameFolder('f1', 'New');
      expect(folderRepo.updateFolder).toHaveBeenCalledWith(
        { name: 'New' },
        'f1',
      );
    });

    it('moveFolder delegates with the target parentId', async () => {
      folderRepo.updateFolder.mockResolvedValue({});
      await service.moveFolder('f1', 'f2');
      expect(folderRepo.updateFolder).toHaveBeenCalledWith(
        { parentId: 'f2' },
        'f1',
      );
    });

    it('moveFolder to root sets parentId null', async () => {
      folderRepo.updateFolder.mockResolvedValue({});
      await service.moveFolder('f1', null);
      expect(folderRepo.updateFolder).toHaveBeenCalledWith(
        { parentId: null },
        'f1',
      );
    });

    it('softDeleteFolder delegates to repo', async () => {
      folderRepo.softDeleteFolder.mockResolvedValue(undefined);
      await service.softDeleteFolder('f1');
      expect(folderRepo.softDeleteFolder).toHaveBeenCalledWith('f1');
    });

    it('getBreadcrumb walks the parent chain to the root', async () => {
      const root = { id: 'r', parentId: null } as any;
      const child = { id: 'c', parentId: 'r' } as any;
      folderRepo.findById.mockImplementation(async (id: string) =>
        id === 'c' ? child : root,
      );

      const crumbs = await service.getBreadcrumb('c');

      expect(crumbs.map((c: any) => c.id)).toEqual(['r', 'c']);
    });
  });

  describe('files', () => {
    it('createFile (personal) forces ownerId to the auth user', async () => {
      const user = makeUser('u1');
      fileRepo.createFile.mockResolvedValue({});

      await service.createFile(user, 'w1', {
        driveType: 'personal',
        folderId: null,
        fileName: 'a.png',
        filePath: 'p',
        fileExt: 'png',
      });

      expect(fileRepo.createFile).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'w1',
          driveType: 'personal',
          ownerId: 'u1',
          creatorId: 'u1',
        }),
      );
    });

    it('listFiles (shared) is scoped to the workspace with null owner', async () => {
      const user = makeUser('u1');
      fileRepo.listFiles.mockResolvedValue([]);

      await service.listFiles(user, 'w1', 'shared', null);

      expect(fileRepo.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'w1',
          driveType: 'shared',
          ownerId: null,
          folderId: null,
        }),
      );
    });

    it('renameFile delegates to repo updateFile', async () => {
      fileRepo.updateFile.mockResolvedValue({});
      await service.renameFile('fi', 'b.png');
      expect(fileRepo.updateFile).toHaveBeenCalledWith(
        { fileName: 'b.png' },
        'fi',
      );
    });

    it('moveFile delegates with the target folderId', async () => {
      fileRepo.updateFile.mockResolvedValue({});
      await service.moveFile('fi', 'f2');
      expect(fileRepo.updateFile).toHaveBeenCalledWith(
        { folderId: 'f2' },
        'fi',
      );
    });

    it('softDeleteFile delegates to repo', async () => {
      fileRepo.softDeleteFile.mockResolvedValue(undefined);
      await service.softDeleteFile('fi');
      expect(fileRepo.softDeleteFile).toHaveBeenCalledWith('fi');
    });
  });
});
