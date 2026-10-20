import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DriveFile,
  DriveFileVersion,
  InsertableDriveFileVersion,
} from '@docmost/db/types/entity.types';
import { DriveFileRepo } from '../../../database/repos/drive/drive-file.repo';
import { DriveFileVersionRepo } from '../../../database/repos/drive/drive-file-version.repo';

export interface RecordVersionInput {
  fileId: string;
  workspaceId: string;
  spaceId: string;
  creatorId: string;
}

export interface RestoreVersionInput {
  fileId: string;
  versionId: string;
  workspaceId: string;
  spaceId: string;
}

/**
 * Tracks immutable snapshots of a drive file's storage path + metadata so an
 * overwritten file can be traced and rolled back. All operations are scoped to
 * the file's drive space.
 *
 * - `recordVersion` snapshots the *current* file state and is called BEFORE the
 *   live `drive_files` row is updated to a new upload.
 * - `restoreVersion` points the live file back at a historical version's path.
 * Authorization is enforced at the controller layer (space CASL `Manage`).
 */
@Injectable()
export class DriveVersionService {
  constructor(
    private readonly fileRepo: DriveFileRepo,
    private readonly versionRepo: DriveFileVersionRepo,
  ) {}

  async recordVersion(input: RecordVersionInput): Promise<DriveFileVersion> {
    const current = await this.fileRepo.findById(input.fileId);
    if (
      !current ||
      current.workspaceId !== input.workspaceId ||
      current.spaceId !== input.spaceId
    ) {
      throw new NotFoundException('File not found');
    }

    const versionNumber = await this.versionRepo.nextVersionNumber(input.fileId);

    const insertable: InsertableDriveFileVersion = {
      workspaceId: input.workspaceId,
      spaceId: input.spaceId,
      fileId: input.fileId,
      versionNumber,
      fileName: current.fileName,
      filePath: current.filePath,
      fileSize: current.fileSize,
      fileExt: current.fileExt,
      mimeType: current.mimeType,
      creatorId: input.creatorId,
    };

    return this.versionRepo.insertVersion(insertable);
  }

  async listVersions(fileId: string): Promise<DriveFileVersion[]> {
    return this.versionRepo.listVersions(fileId);
  }

  async restoreVersion(input: RestoreVersionInput): Promise<DriveFile> {
    const version = await this.versionRepo.getVersion(
      input.versionId,
      input.fileId,
    );
    if (
      !version ||
      version.workspaceId !== input.workspaceId ||
      version.spaceId !== input.spaceId
    ) {
      throw new NotFoundException('Version not found');
    }

    return this.fileRepo.updateFile(
      {
        filePath: version.filePath,
        fileSize: version.fileSize,
        fileExt: version.fileExt,
        mimeType: version.mimeType,
      },
      input.fileId,
      input.spaceId,
    );
  }
}
