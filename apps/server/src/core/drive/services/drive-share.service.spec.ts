import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DriveShareService } from './drive-share.service';
import { DriveShareRepo } from '../../../database/repos/drive/drive-share.repo';
import { DriveService } from './drive.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeFile(over: Partial<any> = {}): any {
  return {
    id: 'f1',
    workspaceId: 'w1',
    spaceId: 'sp1',
    deletedAt: null,
    fileName: 'a.png',
    filePath: 'p',
    ...over,
  };
}

describe('DriveShareService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let shareRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveService: any;
  let service: DriveShareService;

  beforeEach(() => {
    shareRepo = {
      createShare: jest.fn(),
      findByToken: jest.fn(),
    };
    driveService = {
      getFile: jest.fn(),
    };
    service = new DriveShareService(shareRepo, driveService);
  });

  describe('createFileShare', () => {
    it('creates a share scoped to the file space with default read permission', async () => {
      const file = makeFile();
      driveService.getFile.mockResolvedValue(file);
      shareRepo.createShare.mockImplementation(async (insertable: any) => ({
        id: 's1',
        ...insertable,
      }));

      const share = await service.createFileShare({
        authUserId: 'u1',
        workspaceId: 'w1',
        spaceId: 'sp1',
        fileId: 'f1',
        permission: 'read',
        expiresAt: null,
      });

      expect(shareRepo.createShare).toHaveBeenCalledTimes(1);
      const insertable = shareRepo.createShare.mock.calls[0][0];
      expect(typeof insertable.token).toBe('string');
      expect(insertable.token.length).toBeGreaterThan(0);
      expect(insertable.permission).toBe('read');
      expect(insertable.fileId).toBe('f1');
      expect(insertable.creatorId).toBe('u1');
      expect(insertable.workspaceId).toBe('w1');
      expect(insertable.spaceId).toBe('sp1');
      expect(share.token).toBe(insertable.token);
    });

    it('rejects sharing a file that belongs to another space', async () => {
      const file = makeFile({ spaceId: 'sp-other' });
      driveService.getFile.mockResolvedValue(file);

      await expect(
        service.createFileShare({
          authUserId: 'u1',
          workspaceId: 'w1',
          spaceId: 'sp1',
          fileId: 'f1',
          permission: 'read',
          expiresAt: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(shareRepo.createShare).not.toHaveBeenCalled();
    });

    it('rejects sharing a file from another workspace', async () => {
      const file = makeFile({ workspaceId: 'w2' });
      driveService.getFile.mockResolvedValue(file);

      await expect(
        service.createFileShare({
          authUserId: 'u1',
          workspaceId: 'w1',
          spaceId: 'sp1',
          fileId: 'f1',
          permission: 'read',
          expiresAt: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(shareRepo.createShare).not.toHaveBeenCalled();
    });
  });

  describe('resolveShare', () => {
    it('returns the share and file for a valid token', async () => {
      const file = makeFile();
      const share = {
        id: 's1',
        token: 'abc123',
        permission: 'read',
        fileId: 'f1',
        workspaceId: 'w1',
        spaceId: 'sp1',
        deletedAt: null,
        expiresAt: null,
      };
      shareRepo.findByToken.mockResolvedValue(share);
      driveService.getFile.mockResolvedValue(file);

      const resolved = await service.resolveShare('abc123');

      expect(shareRepo.findByToken).toHaveBeenCalledWith('abc123');
      expect(resolved.share).toBe(share);
      expect(resolved.file).toBe(file);
    });

    it('rejects a share whose file moved to another space', async () => {
      const share = {
        id: 's1',
        token: 'abc123',
        permission: 'read',
        fileId: 'f1',
        workspaceId: 'w1',
        spaceId: 'sp1',
        deletedAt: null,
        expiresAt: null,
      };
      shareRepo.findByToken.mockResolvedValue(share);
      driveService.getFile.mockResolvedValue(makeFile({ spaceId: 'sp-other' }));

      await expect(service.resolveShare('abc123')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects an expired share', async () => {
      const share = {
        id: 's1',
        token: 'abc123',
        permission: 'read',
        fileId: 'f1',
        workspaceId: 'w1',
        spaceId: 'sp1',
        deletedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      };
      shareRepo.findByToken.mockResolvedValue(share);

      await expect(service.resolveShare('abc123')).rejects.toThrow(
        /expired/i,
      );
    });

    it('rejects an unknown token', async () => {
      shareRepo.findByToken.mockResolvedValue(undefined);

      await expect(service.resolveShare('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
