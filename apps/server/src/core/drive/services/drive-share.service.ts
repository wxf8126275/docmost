import {
  BadRequestException,
  ForbiddenException,
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
 *  - A personal file can only be shared by its owner.
 *  - A shared (workspace) file can be shared by any workspace member; the
 *    controller additionally enforces the CASL `Manage` ability.
 *  - Resolve rejects expired or soft-deleted links and cross-workspace tokens.
 */
@Injectable()
export class DriveShareService {
  constructor(
    private readonly shareRepo: DriveShareRepo,
    private readonly driveService: DriveService,
  ) {}

  async createFileShare(input: CreateFileShareInput): Promise<DriveShare> {
    const file = await this.driveService.getFile(input.fileId);
    if (
      !file ||
      file.deletedAt ||
      file.workspaceId !== input.workspaceId
    ) {
      throw new NotFoundException('File not found');
    }

    if (file.driveType === 'personal' && file.ownerId !== input.authUserId) {
      throw new ForbiddenException('Cannot share a file you do not own');
    }

    const insertable: InsertableDriveShare = {
      workspaceId: input.workspaceId,
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

    const file = await this.driveService.getFile(share.fileId);
    if (!file || file.deletedAt || file.workspaceId !== share.workspaceId) {
      throw new NotFoundException('Shared file not found');
    }

    return { share, file };
  }
}
