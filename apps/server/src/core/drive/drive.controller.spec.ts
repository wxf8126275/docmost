import { DriveController } from './drive.controller';
import { DrivePublicShareController } from './drive-public-share.controller';
import { DriveModule } from './drive.module';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

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

describe('DriveController (space-scoped)', () => {
  let controller: DriveController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveStorageService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let spaceAbility: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let spaceRepo: any;
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
        spaceId: 'sp1',
        filePath: 'p',
        mimeType: 'image/png',
        fileSize: 123,
        fileExt: '.png',
        folderId: null,
      }),
    };
    driveStorageService = {
      getMaxFileSize: jest.fn().mockReturnValue(50 * 1024 * 1024),
      getFileUploadSizeLimit: jest.fn().mockReturnValue('50mb'),
      generateKey: jest.fn().mockReturnValue('drive/w1/sp1/root/k.png'),
      upload: jest.fn().mockResolvedValue(undefined),
      readStream: jest.fn().mockResolvedValue({ pipe: jest.fn() }),
      assertWithinLimit: jest.fn(),
    };
    spaceAbility = { createForUser: jest.fn() };
    spaceRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'sp1', type: 'drive' }),
    };
    driveShareService = {
      createFileShare: jest.fn().mockResolvedValue({ token: 't' }),
      resolveShare: jest.fn(),
    };
    driveQuotaService = {
      ensureWithinQuota: jest.fn().mockResolvedValue(undefined),
      getQuotaInfo: jest.fn().mockResolvedValue({ usedBytes: 5, quota: 100 }),
    };
    driveVersionService = {
      listVersions: jest.fn().mockResolvedValue([]),
      restoreVersion: jest.fn().mockResolvedValue({ id: 'file1' }),
      recordVersion: jest.fn().mockResolvedValue({ id: 'v1' }),
    };
    controller = new DriveController(
      driveService,
      driveStorageService,
      spaceAbility,
      spaceRepo,
      driveShareService,
      driveQuotaService,
      driveVersionService,
    );
  });

  const allowAbility = () =>
    spaceAbility.createForUser.mockReturnValue(makeAbility(true));
  const denyAbility = () =>
    spaceAbility.createForUser.mockReturnValue(makeAbility(false));

  describe('space guard', () => {
    it('resolves the space and rejects a non-drive space with 403', async () => {
      allowAbility();
      spaceRepo.findById.mockResolvedValue({ id: 'sp1', type: 'page' });

      await expect(
        controller.listFolders(makeUser('u1'), makeWorkspace('w1'), 'sp1', null),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(spaceRepo.findById).toHaveBeenCalledWith('sp1', 'w1');
      expect(driveService.listFolders).not.toHaveBeenCalled();
    });

    it('rejects an unknown space with 403', async () => {
      allowAbility();
      spaceRepo.findById.mockResolvedValue(undefined);

      await expect(
        controller.listFolders(makeUser('u1'), makeWorkspace('w1'), 'sp1', null),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a non-member with 403', async () => {
      spaceAbility.createForUser.mockRejectedValue(
        new NotFoundException('Space permissions not found'),
      );

      await expect(
        controller.listFolders(makeUser('u1'), makeWorkspace('w1'), 'sp1', null),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the space Drive ability is denied', async () => {
      denyAbility();

      await expect(
        controller.listFolders(makeUser('u1'), makeWorkspace('w1'), 'sp1', null),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(driveService.listFolders).not.toHaveBeenCalled();
    });
  });

  describe('folders', () => {
    it('listFolders checks the space ability and delegates space-scoped', async () => {
      allowAbility();
      driveService.listFolders.mockResolvedValue([{ id: 'f1' }]);

      const res = await controller.listFolders(
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
        null,
      );

      expect(spaceAbility.createForUser).toHaveBeenCalledWith(
        makeUser('u1'),
        'sp1',
      );
      expect(driveService.listFolders).toHaveBeenCalledWith(
        makeUser('u1'),
        'w1',
        'sp1',
        null,
      );
      expect(res.folders).toHaveLength(1);
    });

    it('createFolder delegates to service with spaceId', async () => {
      allowAbility();
      await controller.createFolder(makeUser('u1'), makeWorkspace('w1'), 'sp1', {
        name: 'X',
        parentId: null,
      });
      expect(driveService.createFolder).toHaveBeenCalledWith(
        makeUser('u1'),
        'w1',
        { spaceId: 'sp1', name: 'X', parentId: null },
      );
    });

    it('updateFolder renames and/or moves within the space', async () => {
      allowAbility();
      await controller.updateFolder(
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
        'f1',
        { name: 'Y', parentId: 'f2' },
      );
      expect(driveService.renameFolder).toHaveBeenCalledWith('sp1', 'f1', 'Y');
      expect(driveService.moveFolder).toHaveBeenCalledWith('sp1', 'f1', 'f2');
    });

    it('deleteFolder delegates', async () => {
      allowAbility();
      await controller.deleteFolder(makeUser('u1'), makeWorkspace('w1'), 'sp1', 'f1');
      expect(driveService.softDeleteFolder).toHaveBeenCalledWith('sp1', 'f1');
    });
  });

  describe('files', () => {
    it('listFiles delegates with space scoping', async () => {
      allowAbility();
      driveService.listFiles.mockResolvedValue([{ id: 'file1' }]);
      const res = await controller.listFiles(
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
        null,
      );
      expect(driveService.listFiles).toHaveBeenCalledWith(
        makeUser('u1'),
        'w1',
        'sp1',
        null,
      );
      expect(res.files).toHaveLength(1);
    });

    it('uploadFile uploads to storage and creates a space-scoped record', async () => {
      allowAbility();
      const req: any = {
        body: {},
        file: jest.fn().mockResolvedValue({
          filename: 'a.png',
          mimetype: 'image/png',
          file: { pipe: jest.fn() },
          fields: { folderId: { value: null } },
        }),
      };
      const res: any = { send: jest.fn() };

      await controller.uploadFile(
        req,
        res,
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
      );

      expect(driveStorageService.generateKey).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'w1',
          spaceId: 'sp1',
          fileName: 'a.png',
        }),
      );
      expect(driveStorageService.upload).toHaveBeenCalledTimes(1);
      expect(driveStorageService.assertWithinLimit).toHaveBeenCalledWith(123);
      expect(driveQuotaService.ensureWithinQuota).toHaveBeenCalledWith('sp1', 123);
      expect(driveService.createFile).toHaveBeenCalledWith(
        makeUser('u1'),
        'w1',
        expect.objectContaining({
          spaceId: 'sp1',
          fileName: 'a.png',
          fileExt: '.png',
          mimeType: 'image/png',
        }),
      );
      expect(res.send).toHaveBeenCalled();
    });

    it('updateFile renames and/or moves within the space', async () => {
      allowAbility();
      await controller.updateFile(
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
        'file1',
        { fileName: 'b.png', folderId: 'f2' },
      );
      expect(driveService.renameFile).toHaveBeenCalledWith('sp1', 'file1', 'b.png');
      expect(driveService.moveFile).toHaveBeenCalledWith('sp1', 'file1', 'f2');
    });

    it('deleteFile delegates', async () => {
      allowAbility();
      await controller.deleteFile(makeUser('u1'), makeWorkspace('w1'), 'sp1', 'file1');
      expect(driveService.softDeleteFile).toHaveBeenCalledWith('sp1', 'file1');
    });

    it('downloadFile resolves the file within the space and streams it', async () => {
      allowAbility();
      const req: any = {};
      const res: any = {
        header: jest.fn(),
        headers: jest.fn(),
        send: jest.fn(),
      };

      await controller.downloadFile(
        req,
        res,
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
        'file1',
      );

      expect(driveService.getFile).toHaveBeenCalledWith('file1', 'sp1');
      expect(driveStorageService.readStream).toHaveBeenCalledWith('p');
      expect(res.send).toHaveBeenCalled();
    });

    it('downloadFile rejects a file outside the space', async () => {
      allowAbility();
      driveService.getFile.mockResolvedValue({
        id: 'file1',
        workspaceId: 'w1',
        spaceId: 'sp-other',
      });
      const req: any = {};
      const res: any = { header: jest.fn(), headers: jest.fn(), send: jest.fn() };

      await expect(
        controller.downloadFile(
          req,
          res,
          makeUser('u1'),
          makeWorkspace('w1'),
          'sp1',
          'file1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('quota & share & versions', () => {
    it('getQuota aggregates by space', async () => {
      allowAbility();
      const res = await controller.getQuota(
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
      );
      expect(driveQuotaService.getQuotaInfo).toHaveBeenCalledWith('sp1');
      expect(res).toEqual({ usedBytes: 5, quota: 100 });
    });

    it('createFileShare delegates space-scoped', async () => {
      allowAbility();
      await controller.createFileShare(
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
        'file1',
        { permission: 'read' },
      );
      expect(driveService.getFile).toHaveBeenCalledWith('file1', 'sp1');
      expect(driveShareService.createFileShare).toHaveBeenCalledWith(
        expect.objectContaining({
          authUserId: 'u1',
          workspaceId: 'w1',
          spaceId: 'sp1',
          fileId: 'file1',
          permission: 'read',
        }),
      );
    });

    it('listFileVersions resolves the file within the space', async () => {
      allowAbility();
      driveVersionService.listVersions.mockResolvedValue([
        { id: 'v1', versionNumber: 1, fileName: 'a.png' },
      ]);
      const res = await controller.listFileVersions(
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
        'file1',
      );
      expect(driveService.getFile).toHaveBeenCalledWith('file1', 'sp1');
      expect(driveVersionService.listVersions).toHaveBeenCalledWith('file1');
      expect(res.versions).toHaveLength(1);
    });

    it('restoreFileVersion delegates space-scoped', async () => {
      allowAbility();
      await controller.restoreFileVersion(
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
        'file1',
        'v1',
      );
      expect(driveVersionService.restoreVersion).toHaveBeenCalledWith({
        fileId: 'file1',
        versionId: 'v1',
        workspaceId: 'w1',
        spaceId: 'sp1',
      });
    });

    it('uploadFileVersion snapshots and updates space-scoped', async () => {
      allowAbility();
      const req: any = {
        body: {},
        file: jest.fn().mockResolvedValue({
          filename: 'b.png',
          mimetype: 'image/png',
          file: { pipe: jest.fn() },
          fields: {},
        }),
      };
      const res: any = { send: jest.fn() };

      await controller.uploadFileVersion(
        req,
        res,
        makeUser('u1'),
        makeWorkspace('w1'),
        'sp1',
        'file1',
      );

      expect(driveStorageService.generateKey).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: 'w1', spaceId: 'sp1' }),
      );
      expect(driveQuotaService.ensureWithinQuota).toHaveBeenCalledWith('sp1', 123);
      expect(driveVersionService.recordVersion).toHaveBeenCalledWith({
        fileId: 'file1',
        workspaceId: 'w1',
        spaceId: 'sp1',
        creatorId: 'u1',
      });
      expect(driveService.updateFile).toHaveBeenCalledWith(
        'sp1',
        'file1',
        expect.objectContaining({ fileName: 'b.png' }),
      );
      expect(res.send).toHaveBeenCalled();
    });
  });
});

describe('DrivePublicShareController', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveShareService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let driveStorageService: any;
  let controller: DrivePublicShareController;

  beforeEach(() => {
    driveShareService = { resolveShare: jest.fn() };
    driveStorageService = {
      readStream: jest.fn().mockResolvedValue({ pipe: jest.fn() }),
    };
    controller = new DrivePublicShareController(
      driveShareService,
      driveStorageService,
    );
  });

  it('getShare resolves the token publicly', async () => {
    driveShareService.resolveShare.mockResolvedValue({
      share: { token: 't', permission: 'read', expiresAt: null },
      file: { id: 'file1', fileName: 'a.png', fileSize: 1, fileExt: '.png', mimeType: 'image/png', type: 'image/png' },
    });

    const res = await controller.getShare('t');
    expect(driveShareService.resolveShare).toHaveBeenCalledWith('t');
    expect(res.file.id).toBe('file1');
  });

  it('downloadSharedFile streams when the permission allows', async () => {
    driveShareService.resolveShare.mockResolvedValue({
      share: { token: 't', permission: 'download' },
      file: { id: 'file1', filePath: 'p', mimeType: 'image/png', fileName: 'a.png' },
    });
    const res: any = { headers: jest.fn(), send: jest.fn() };

    await controller.downloadSharedFile({} as any, res, 't');
    expect(driveStorageService.readStream).toHaveBeenCalledWith('p');
    expect(res.send).toHaveBeenCalled();
  });

  it('downloadSharedFile rejects a read-only share', async () => {
    driveShareService.resolveShare.mockResolvedValue({
      share: { token: 't', permission: 'read' },
      file: { id: 'file1', filePath: 'p' },
    });
    const res: any = { headers: jest.fn(), send: jest.fn() };

    await expect(
      controller.downloadSharedFile({} as any, res, 't'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('DriveModule wiring', () => {
  it('registers the space-scoped controllers and drops DriveAbilityFactory', () => {
    const controllers = (Reflect.getMetadata('controllers', DriveModule) ??
      []) as unknown[];
    const controllerNames = controllers.map((c: any) => c?.name);
    expect(controllerNames).toContain('DriveController');
    expect(controllerNames).toContain('DrivePublicShareController');

    const providers = (Reflect.getMetadata('providers', DriveModule) ??
      []) as unknown[];
    const providerNames = providers.map((p: any) => p?.name);
    expect(providerNames).not.toContain('DriveAbilityFactory');
    expect(providerNames).toContain('DriveService');
  });
});
