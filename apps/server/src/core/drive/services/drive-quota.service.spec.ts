import { BadRequestException } from '@nestjs/common';
import { DriveQuotaService } from './drive-quota.service';

describe('DriveQuotaService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fileRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let environmentService: any;
  let service: DriveQuotaService;

  beforeEach(() => {
    fileRepo = { sumFileSizes: jest.fn() };
    environmentService = { getDriveStorageQuota: jest.fn() };
    service = new DriveQuotaService(fileRepo, environmentService);
  });

  describe('getUsedBytes', () => {
    it('sums personal drive files for the user', async () => {
      fileRepo.sumFileSizes.mockResolvedValue(1234);
      const used = await service.getUsedBytes('w1', 'personal', 'u1');
      expect(fileRepo.sumFileSizes).toHaveBeenCalledWith({
        workspaceId: 'w1',
        driveType: 'personal',
        ownerId: 'u1',
      });
      expect(used).toBe(1234);
    });
  });

  describe('ensureWithinQuota', () => {
    it('rejects when used + new file exceeds the quota', async () => {
      fileRepo.sumFileSizes.mockResolvedValue(9 * 1024 * 1024 * 1024); // 9 GB
      environmentService.getDriveStorageQuota.mockReturnValue(
        10 * 1024 * 1024 * 1024,
      ); // 10 GB

      await expect(
        service.ensureWithinQuota('w1', 'personal', 'u1', 2 * 1024 * 1024 * 1024),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows when used + new file is within the quota', async () => {
      fileRepo.sumFileSizes.mockResolvedValue(9 * 1024 * 1024 * 1024);
      environmentService.getDriveStorageQuota.mockReturnValue(
        10 * 1024 * 1024 * 1024,
      );

      await expect(
        service.ensureWithinQuota('w1', 'personal', 'u1', 1 * 1024 * 1024 * 1024),
      ).resolves.toBeUndefined();
    });

    it('allows everything when no quota is configured', async () => {
      fileRepo.sumFileSizes.mockResolvedValue(1000);
      environmentService.getDriveStorageQuota.mockReturnValue(null);

      await expect(
        service.ensureWithinQuota('w1', 'personal', 'u1', Number.MAX_SAFE_INTEGER),
      ).resolves.toBeUndefined();
    });
  });
});
