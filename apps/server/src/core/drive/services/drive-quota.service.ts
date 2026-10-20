import { BadRequestException, Injectable } from '@nestjs/common';
import { DriveFileRepo } from '../../../database/repos/drive/drive-file.repo';
import { EnvironmentService } from '../../../integrations/environment/environment.service';

/**
 * Aggregates drive storage usage per drive space and enforces the configured
 * capacity ceiling.
 *
 * Quota is read from `DRIVE_STORAGE_QUOTA` (parsed with the `bytes` helper so
 * "10gb" works) and applies per drive space. When unset, uploads are unbounded.
 */
@Injectable()
export class DriveQuotaService {
  constructor(
    private readonly fileRepo: DriveFileRepo,
    private readonly environmentService: EnvironmentService,
  ) {}

  async getUsedBytes(spaceId: string): Promise<number> {
    return this.fileRepo.sumFileSizes({ spaceId });
  }

  getQuota(): number | null {
    return this.environmentService.getDriveStorageQuota();
  }

  async getQuotaInfo(
    spaceId: string,
  ): Promise<{ usedBytes: number; quota: number | null }> {
    const [usedBytes, quota] = await Promise.all([
      this.getUsedBytes(spaceId),
      Promise.resolve(this.getQuota()),
    ]);
    return { usedBytes, quota };
  }

  async ensureWithinQuota(
    spaceId: string,
    additionalBytes: number,
  ): Promise<void> {
    const quota = this.getQuota();
    if (quota == null) return;

    const used = await this.getUsedBytes(spaceId);
    if (used + additionalBytes > quota) {
      throw new BadRequestException('Storage quota exceeded');
    }
  }
}
