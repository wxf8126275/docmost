import { DriveController } from './drive.controller';
import { DriveService } from './services/drive.service';
import { DriveStorageService } from './services/drive-storage.service';
import { DriveShareService } from './services/drive-share.service';
import { DriveQuotaService } from './services/drive-quota.service';
import { DriveVersionService } from './services/drive-version.service';
import DriveAbilityFactory from '../casl/abilities/drive-ability.factory';
import { ForbiddenException } from '@nestjs/common';
import { DriveCaslSubject } from '../casl/interfaces/drive-ability.type';

jest.mock('../../common/helpers/utils', () => ({
  createByteCountingStream: jest.fn(() => ({
    stream: { pipe: jest.fn() },
    getBytesRead: () => 123,
  })),
}));

function makeUser(id: string) {
  return { id, role: 'member' } as any;
}
function makeWorkspace(id: string) {
  return { id, hostname: 'x' } as any;
}
function makeAbility(can: boolean) {
  return {
    can: jest.fn().mockReturnValue(can),
    cannot: jest.fn().mockReturnValue(!can),
  };
}

describe('DriveController', () => {
  let controller: DriveController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveStorageService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveAbility: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveShareService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveQuotaService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveVersionService: any;

  beforeEach(() => {
    driveService = {
      listFolders: jest.fn().mockResolvedValue([]),
      createFolder: jest.fn().mockResolvedValue({ id: 'f1' }),
      renameFolder: jest.fn().mockResolvedValue({}),
      moveFolder: jest.fn().mockResolvedValue({}),
      softDeleteFolder: jest.fn().mockResolvedValue(undefined),
      listFiles: jest.fn().mockResolvedValue([]),
      createFile: jest.fn().mockResolvedValue({ id: 'file1' }),
      renameFile: jest.fn().mockResolvedValue({}),
      moveFile: jest.fn().mockResolvedValue({}),
      updateFile: jest.fn().mockResolvedValue({ id: 'file1' }),
      softDeleteFile: jest.fn().mockResolvedValue(undefined),
      getFile: jest.fn().mockResolvedValue({
        id: 'file1',
        workspaceId: 'w1',
        filePath: 'p',
        mimeType: 'image/png',
        fileSize: 123,
        fileExt: '.png',
      }),
    };
    driveStorageService = {
      getMaxFileSize: jest.fn().mockReturnValue(50 * 1024 * 1024),
      getFileUploadSizeLimit: jest.fn().mockReturnValue('50mb'),
      generateKey: jest.fn().mockReturnValue('drive/w1/personal/u1/root/k.png'),
      upload: jest.fn().mockResolvedValue(undefined),
      readStream: jest.fn().mockResolvedValue({ pipe: jest.fn() }),
      assertWithinLimit: jest.fn(),
    };
    driveAbility = { createForUser: jest.fn() };
    driveShareService = {
      createFileShare: jest.fn(),
      resolveShare: jest.fn(),
    };
    driveQuotaService = {
      ensureWithinQuota: jest.fn().mockResolvedValue(undefined),
    };
    driveVersionService = {
      listVersions: jest.fn().mockResolvedValue([]),
      restoreVersion: jest.fn().mockResolvedValue({ id: 'file1' }),
      recordVersion: jest.fn().mockResolvedValue({ id: 'v1' }),
    };
    controller = new DriveController(
      driveService,
      driveStorageService,
      driveAbility,
      driveShareService,
      driveQuotaService,
      driveVersionService,
    );
  });

  const allowAbility = () => driveAbility.createForUser.mockReturnValue(makeAbility(true));
  const denyAbility = () => driveAbility.createForUser.mockReturnValue(makeAbility(false));

  describe('folders', () => {
    it('listFolders checks ability and delegates with user scoping', async () => {
      allowAbility();
      driveService.listFolders.mockResolvedValue([{ id: 'f1' }]);

      const res = await controller.listFolders(
        makeUser('u1'),
        makeWorkspace('w1'),
        'personal',
        null,
      );

      expect(driveAbility.createForUser).toHaveBeenCalledWith(makeUser('u1'), {
        driveType: 'personal',
        ownerId: 'u1',
      });
      expect(driveService.listFolders).toHaveBeenCalledWith(
        makeUser('u1'),
        'w1',
        'personal',
        null,
      );
      expect(res.folders).toHaveLength(1);
    });

    it('listFolders throws Forbidden when ability is denied', async () => {
      denyAbility();
      await expect(
        controller.listFolders(makeUser('u1'), makeWorkspace('w1'), 'personal', null),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('createFolder delegates to service', async () => {
      allowAbility();
      await controller.createFolder(makeUser('u1'), makeWorkspace('w1'), {
        driveType: 'personal',
        name: 'X',
        parentId: null,
      });
      expect(driveService.createFolder).toHaveBeenCalledWith(makeUser('u1'), 'w1', {
        driveType: 'personal',
        name: 'X',
        parentId: null,
      });
    });

    it('updateFolder renames and/or moves', async () => {
      allowAbility();
      await controller.updateFolder(makeUser('u1'), makeWorkspace('w1'), 'f1', {
        driveType: 'personal',
        name: 'Y',
        parentId: 'f2',
      });
      expect(driveService.renameFolder).toHaveBeenCalledWith('f1', 'Y');
      expect(driveService.moveFolder).toHaveBeenCalledWith('f1', 'f2');
    });

    it('deleteFolder delegates', async () => {
      allowAbility();
      await controller.deleteFolder(makeUser('u1'), makeWorkspace('w1'), 'f1', 'personal');
      expect(driveService.softDeleteFolder).toHaveBeenCalledWith('f1');
    });
  });

  describe('files', () => {
    it('listFiles delegates with scoping', async () => {
      allowAbility();
      driveService.listFiles.mockResolvedValue([{ id: 'file1' }]);
      const res = await controller.listFiles(
        makeUser('u1'),
        makeWorkspace('w1'),
        'shared',
        null,
      );
      expect(driveService.listFiles).toHaveBeenCalledWith(
        makeUser('u1'),
        'w1',
        'shared',
        null,
      );
      expect(res.files).toHaveLength(1);
    });

    it('uploadFile uploads to storage and creates a record', async () => {
      allowAbility();
      const req: any = {
        body: {},
        file: jest.fn().mockResolvedValue({
          filename: 'a.png',
          mimetype: 'image/png',
          file: { pipe: jest.fn() },
          fields: { driveType: { value: 'personal' }, folderId: { value: null } },
        }),
      };
      const res: any = { send: jest.fn() };

      await controller.uploadFile(req, res, makeUser('u1'), makeWorkspace('w1'));

      expect(driveStorageService.getMaxFileSize).toHaveBeenCalled();
      expect(driveStorageService.generateKey).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: 'a.png', driveType: 'personal' }),
      );
      expect(driveStorageService.upload).toHaveBeenCalledTimes(1);
      expect(driveStorageService.assertWithinLimit).toHaveBeenCalledWith(123);
      expect(driveService.createFile).toHaveBeenCalledWith(
        makeUser('u1'),
        'w1',
        expect.objectContaining({
          fileName: 'a.png',
          fileExt: '.png',
          mimeType: 'image/png',
          driveType: 'personal',
        }),
      );
      expect(res.send).toHaveBeenCalled();
    });

    it('updateFile renames and/or moves', async () => {
      allowAbility();
      await controller.updateFile(makeUser('u1'), makeWorkspace('w1'), 'file1', {
        driveType: 'shared',
        fileName: 'b.png',
        folderId: 'f2',
      });
      expect(driveService.renameFile).toHaveBeenCalledWith('file1', 'b.png');
      expect(driveService.moveFile).toHaveBeenCalledWith('file1', 'f2');
    });

    it('deleteFile delegates', async () => {
      allowAbility();
      await controller.deleteFile(makeUser('u1'), makeWorkspace('w1'), 'file1', 'shared');
      expect(driveService.softDeleteFile).toHaveBeenCalledWith('file1');
    });

    it('downloadFile reads the file from storage and streams it', async () => {
      allowAbility();
      const req: any = {};
      const res: any = {
        header: jest.fn(),
        headers: jest.fn(),
        send: jest.fn(),
      };

      await controller.downloadFile(req, res, makeUser('u1'), makeWorkspace('w1'), 'file1', 'personal');

      expect(driveService.getFile).toHaveBeenCalledWith('file1');
      expect(driveStorageService.readStream).toHaveBeenCalledWith('p');
      expect(res.send).toHaveBeenCalled();
    });
  });
});
