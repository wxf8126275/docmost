import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { nanoIdGen } from '../../../common/helpers';
import { DriveShareRepo } from '../../../database/repos/drive/drive-share.repo';
import {
  DriveFile,
  DriveShare,
  InsertableDriveShare,
} from '@docmost/db/types/entity.types';
import { DriveService } from './drive.service';

export type SharePermission = 'read' | 'download';

export interface CreateFileShareInput {
  authUserId: string;
  workspaceId: string;
  spaceId: string;
  fileId: string;
  permission: SharePermission;
  expiresAt?: Date | null;
}

export interface ResolvedShare {
  share: DriveShare;
  file: DriveFile;
}

/**
 * Creates and resolves time-boxed, token-gated share links for drive files.
 * Authorization boundary:
 *  - The caller must be a member of the file's drive space with the Manage
 *    Drive ability (enforced at the controller layer via space CASL).
 *  - Shares are scoped to the file's space; a file can never be shared into
 *    another space.
 *  - Resolve rejects expired or soft-deleted links and cross-workspace tokens.
 */
@Injectable()
export class DriveShareService {
  constructor(
    private readonly shareRepo: DriveShareRepo,
    private readonly driveService: DriveService,
  ) {}

  async createFileShare(input: CreateFileShareInput): Promise<DriveShare> {
    const file = await this.driveService.getFile(input.fileId, input.spaceId);
    if (
      !file ||
      file.deletedAt ||
      file.workspaceId !== input.workspaceId ||
      file.spaceId !== input.spaceId
    ) {
      throw new NotFoundException('File not found');
    }

    const insertable: InsertableDriveShare = {
      workspaceId: input.workspaceId,
      spaceId: input.spaceId,
      fileId: input.fileId,
      creatorId: input.authUserId,
      token: nanoIdGen().toLowerCase(),
      permission: input.permission,
      expiresAt: input.expiresAt ?? null,
    };

    return this.shareRepo.createShare(insertable);
  }

  async resolveShare(token: string): Promise<ResolvedShare> {
    const share = await this.shareRepo.findByToken(token);
    if (!share || share.deletedAt) {
      throw new NotFoundException('Share link not found');
    }

    if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Share link has expired');
    }

    const file = await this.driveService.getFile(share.fileId, share.spaceId);
    if (
      !file ||
      file.deletedAt ||
      file.workspaceId !== share.workspaceId ||
      file.spaceId !== share.spaceId
    ) {
      throw new NotFoundException('Shared file not found');
    }

    return { share, file };
  }
}
