import { BadRequestException, Injectable } from '@nestjs/common';
import { DriveFileRepo } from '../../../database/repos/drive/drive-file.repo';
import { EnvironmentService } from '../../../integrations/environment/environment.service';

export type QuotaScope = 'personal' | 'shared';

/**
 * Aggregates drive storage usage and enforces the configured capacity ceiling.
 *
 * Quota is read from `DRIVE_STORAGE_QUOTA` (parsed with the `bytes` helper so
 * "10gb" works) and is workspace-wide. When unset, uploads are unbounded. The
 * personal scope sums only the requesting user's files; the shared scope sums
 * the workspace's shared drive (ownerId is null).
 */
@Injectable()
export class DriveQuotaService {
  constructor(
    private readonly fileRepo: DriveFileRepo,
    private readonly environmentService: EnvironmentService,
  ) {}

  async getUsedBytes(
    workspaceId: string,
    scope: QuotaScope,
    userId?: string,
  ): Promise<number> {
    const ownerId = scope === 'personal' ? userId ?? null : null;
    return this.fileRepo.sumFileSizes({ workspaceId, driveType: scope, ownerId });
  }

  getQuota(): number | null {
    return this.environmentService.getDriveStorageQuota();
  }

  async getQuotaInfo(
    workspaceId: string,
    scope: QuotaScope,
    userId?: string,
  ): Promise<{ usedBytes: number; quota: number | null }> {
    const [usedBytes, quota] = await Promise.all([
      this.getUsedBytes(workspaceId, scope, userId),
      Promise.resolve(this.getQuota()),
    ]);
    return { usedBytes, quota };
  }

  async ensureWithinQuota(
    workspaceId: string,
    scope: QuotaScope,
    userId: string,
    additionalBytes: number,
  ): Promise<void> {
    const quota = this.getQuota();
    if (quota == null) return;

    const used = await this.getUsedBytes(workspaceId, scope, userId);
    if (used + additionalBytes > quota) {
      throw new BadRequestException('Storage quota exceeded');
    }
  }
}
