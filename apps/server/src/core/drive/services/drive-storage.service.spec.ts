import { DriveStorageService } from './drive-storage.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { EnvironmentService } from '../../../integrations/environment/environment.service';
import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import * as bytes from 'bytes';

describe('DriveStorageService', () => {
  let service: DriveStorageService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storageService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let environmentService: any;

  beforeEach(() => {
    storageService = {
      upload: jest.fn().mockResolvedValue(undefined),
      readStream: jest.fn().mockResolvedValue({ pipe: jest.fn() }),
    };
    environmentService = {
      getFileUploadSizeLimit: jest.fn().mockReturnValue('50mb'),
    };
    service = new DriveStorageService(storageService, environmentService);
  });

  it('getMaxFileSize parses the configured limit into bytes', () => {
    expect(service.getMaxFileSize()).toBe(bytes('50mb'));
  });

  it('generateKey builds the space-scoped drive prefix', () => {
    const key = service.generateKey({
      workspaceId: 'w1',
      spaceId: 'sp1',
      folderId: null,
      fileName: 'a.png',
    });
    expect(key.startsWith('drive/w1/sp1/root/')).toBe(true);
    expect(key.endsWith('.png')).toBe(true);
  });

  it('generateKey nests under the folder id when present', () => {
    const key = service.generateKey({
      workspaceId: 'w1',
      spaceId: 'sp1',
      folderId: 'f2',
      fileName: 'b.jpg',
    });
    expect(key.startsWith('drive/w1/sp1/f2/')).toBe(true);
    expect(key.endsWith('.jpg')).toBe(true);
  });

  it('generateKey no longer contains driveType/ownerId segments', () => {
    const key = service.generateKey({
      workspaceId: 'w1',
      spaceId: 'sp1',
      folderId: null,
      fileName: 'a.png',
    });
    expect(key).not.toContain('personal');
    expect(key).not.toContain('shared');
    expect(key).not.toContain('u1');
  });

  it('upload delegates to StorageService with the key and stream', async () => {
    const stream = Readable.from(Buffer.from('x'));
    await service.upload('drive/w1/sp1/root/k.png', stream);
    expect(storageService.upload).toHaveBeenCalledWith(
      'drive/w1/sp1/root/k.png',
      stream,
    );
  });

  it('readStream delegates to StorageService', async () => {
    await service.readStream('some/key');
    expect(storageService.readStream).toHaveBeenCalledWith('some/key');
  });

  it('assertWithinLimit throws when the size exceeds the limit', () => {
    environmentService.getFileUploadSizeLimit.mockReturnValue('1kb');
    expect(() => service.assertWithinLimit(2048)).toThrow(BadRequestException);
  });

  it('assertWithinLimit passes when the size is within the limit', () => {
    environmentService.getFileUploadSizeLimit.mockReturnValue('50mb');
    expect(() => service.assertWithinLimit(1024)).not.toThrow();
  });

  it('assertWithinLimit allows any size when no limit is configured', () => {
    environmentService.getFileUploadSizeLimit.mockReturnValue('');
    expect(() => service.assertWithinLimit(999999999)).not.toThrow();
  });
});
