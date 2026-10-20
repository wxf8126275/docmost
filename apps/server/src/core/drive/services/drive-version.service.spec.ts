import { NotFoundException } from '@nestjs/common';
import { DriveVersionService } from './drive-version.service';

describe('DriveVersionService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fileRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let versionRepo: any;
  let service: DriveVersionService;

  beforeEach(() => {
    fileRepo = {
      findById: jest.fn(),
      updateFile: jest.fn(),
    };
    versionRepo = {
      insertVersion: jest.fn(),
      listVersions: jest.fn(),
      getVersion: jest.fn(),
      nextVersionNumber: jest.fn(),
    };
    service = new DriveVersionService(fileRepo, versionRepo);
  });

  describe('recordVersion', () => {
    it('snapshots the current file into a new version row', async () => {
      fileRepo.findById.mockResolvedValue({
        id: 'f1',
        workspaceId: 'w1',
        spaceId: 'sp1',
        fileName: 'a.png',
        filePath: 'old-key',
        fileSize: 123,
        fileExt: '.png',
        mimeType: 'image/png',
      });
      versionRepo.nextVersionNumber.mockResolvedValue(2);
      versionRepo.insertVersion.mockImplementation(async (v: any) => ({
        id: 'v2',
        ...v,
      }));

      const version = await service.recordVersion({
        fileId: 'f1',
        workspaceId: 'w1',
        spaceId: 'sp1',
        creatorId: 'u1',
      });

      expect(versionRepo.insertVersion).toHaveBeenCalledTimes(1);
      const inserted = versionRepo.insertVersion.mock.calls[0][0];
      expect(inserted.filePath).toBe('old-key');
      expect(inserted.fileSize).toBe(123);
      expect(inserted.versionNumber).toBe(2);
      expect(inserted.fileId).toBe('f1');
      expect(inserted.workspaceId).toBe('w1');
      expect(inserted.spaceId).toBe('sp1');
      expect(inserted.creatorId).toBe('u1');
      expect(version.id).toBe('v2');
    });

    it('rejects a file that belongs to another space', async () => {
      fileRepo.findById.mockResolvedValue({
        id: 'f1',
        workspaceId: 'w1',
        spaceId: 'sp-other',
      });

      await expect(
        service.recordVersion({
          fileId: 'f1',
          workspaceId: 'w1',
          spaceId: 'sp1',
          creatorId: 'u1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(versionRepo.insertVersion).not.toHaveBeenCalled();
    });
  });

  describe('listVersions', () => {
    it('returns versions from the repo', async () => {
      const versions = [{ id: 'v1' }, { id: 'v2' }];
      versionRepo.listVersions.mockResolvedValue(versions);
      const result = await service.listVersions('f1');
      expect(versionRepo.listVersions).toHaveBeenCalledWith('f1');
      expect(result).toBe(versions);
    });
  });

  describe('restoreVersion', () => {
    it('points the current file to the historical version path', async () => {
      versionRepo.getVersion.mockResolvedValue({
        id: 'v1',
        fileId: 'f1',
        workspaceId: 'w1',
        spaceId: 'sp1',
        filePath: 'history-key',
        fileSize: 10,
        fileExt: '.png',
        mimeType: 'image/png',
        versionNumber: 1,
      });
      fileRepo.updateFile.mockImplementation(async (u: any, id: string) => ({
        id,
        ...u,
      }));

      const updated = await service.restoreVersion({
        fileId: 'f1',
        versionId: 'v1',
        workspaceId: 'w1',
        spaceId: 'sp1',
      });

      expect(fileRepo.updateFile).toHaveBeenCalledWith(
        {
          filePath: 'history-key',
          fileSize: 10,
          fileExt: '.png',
          mimeType: 'image/png',
        },
        'f1',
        'sp1',
      );
      expect(updated.filePath).toBe('history-key');
    });

    it('rejects a version from another space', async () => {
      versionRepo.getVersion.mockResolvedValue({
        id: 'v1',
        fileId: 'f1',
        workspaceId: 'w1',
        spaceId: 'sp-other',
        filePath: 'x',
      });
      await expect(
        service.restoreVersion({
          fileId: 'f1',
          versionId: 'v1',
          workspaceId: 'w1',
          spaceId: 'sp1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fileRepo.updateFile).not.toHaveBeenCalled();
    });

    it('rejects a version that does not belong to the file', async () => {
      versionRepo.getVersion.mockResolvedValue({
        id: 'v1',
        fileId: 'other',
        filePath: 'x',
      });
      await expect(
        service.restoreVersion({
          fileId: 'f1',
          versionId: 'v1',
          workspaceId: 'w1',
          spaceId: 'sp1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fileRepo.updateFile).not.toHaveBeenCalled();
    });
  });
});
