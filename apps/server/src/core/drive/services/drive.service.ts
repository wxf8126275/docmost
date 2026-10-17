import { Injectable } from '@nestjs/common';
import { User } from '@docmost/db/types/entity.types';
import {
  DriveFolder,
  DriveFile,
  InsertableDriveFolder,
  InsertableDriveFile,
  UpdatableDriveFile,
} from '@docmost/db/types/entity.types';
import { DriveFolderRepo } from '../../../database/repos/drive/drive-folder.repo';
import { DriveFileRepo } from '../../../database/repos/drive/drive-file.repo';

export interface CreateFolderInput {
  driveType: 'personal' | 'shared';
  name: string;
  parentId?: string | null;
  /** Ignored for personal drives (forced to the auth user). */
  ownerId?: string;
}

export interface CreateFileInput {
  driveType: 'personal' | 'shared';
  folderId?: string | null;
  fileName: string;
  filePath: string;
  fileExt: string;
  fileSize?: number | null;
  mimeType?: string | null;
  type?: string | null;
  /** Ignored for personal drives (forced to the auth user). */
  ownerId?: string;
}

/**
 * Business logic for the Cloud Drive feature. Authorization (CASL) is applied at
 * the controller layer (mirroring the rest of the codebase). This service owns
 * the ownership rules: a personal drive's folders/files are always attributed to
 * the requesting user, while a shared drive is workspace-scoped (ownerId = null).
 */
@Injectable()
export class DriveService {
  constructor(
    private readonly folderRepo: DriveFolderRepo,
    private readonly fileRepo: DriveFileRepo,
  ) {}

  // ---- Folders ----

  async createFolder(
    authUser: User,
    workspaceId: string,
    dto: CreateFolderInput,
  ): Promise<DriveFolder> {
    const ownerId = dto.driveType === 'personal' ? authUser.id : null;

    const insertable: InsertableDriveFolder = {
      workspaceId,
      driveType: dto.driveType,
      ownerId,
      parentId: dto.parentId ?? null,
      name: dto.name,
      creatorId: authUser.id,
    };

    return this.folderRepo.createFolder(insertable);
  }

  async listFolders(
    authUser: User,
    workspaceId: string,
    driveType: 'personal' | 'shared',
    parentId?: string | null,
  ): Promise<DriveFolder[]> {
    const ownerId = driveType === 'personal' ? authUser.id : null;
    return this.folderRepo.listFolders({
      workspaceId,
      driveType,
      ownerId,
      parentId: parentId ?? null,
    });
  }

  async renameFolder(
    folderId: string,
    name: string,
  ): Promise<DriveFolder> {
    return this.folderRepo.updateFolder({ name }, folderId);
  }

  async moveFolder(
    folderId: string,
    targetParentId: string | null,
  ): Promise<DriveFolder> {
    return this.folderRepo.updateFolder(
      { parentId: targetParentId ?? null },
      folderId,
    );
  }

  async softDeleteFolder(folderId: string): Promise<void> {
    return this.folderRepo.softDeleteFolder(folderId);
  }

  /** Walks the parent chain from `folderId` back to the root, inclusive. */
  async getBreadcrumb(folderId: string): Promise<DriveFolder[]> {
    const crumbs: DriveFolder[] = [];
    let current = await this.folderRepo.findById(folderId);

    while (current) {
      crumbs.unshift(current);
      if (!current.parentId) break;
      current = await this.folderRepo.findById(current.parentId);
    }

    return crumbs;
  }

  // ---- Files ----

  async createFile(
    authUser: User,
    workspaceId: string,
    dto: CreateFileInput,
  ): Promise<DriveFile> {
    const ownerId = dto.driveType === 'personal' ? authUser.id : null;

    const insertable: InsertableDriveFile = {
      workspaceId,
      driveType: dto.driveType,
      ownerId,
      folderId: dto.folderId ?? null,
      fileName: dto.fileName,
      filePath: dto.filePath,
      fileExt: dto.fileExt,
      fileSize: dto.fileSize ?? null,
      mimeType: dto.mimeType ?? null,
      type: dto.type ?? null,
      creatorId: authUser.id,
    };

    return this.fileRepo.createFile(insertable);
  }

  async listFiles(
    authUser: User,
    workspaceId: string,
    driveType: 'personal' | 'shared',
    folderId?: string | null,
  ): Promise<DriveFile[]> {
    const ownerId = driveType === 'personal' ? authUser.id : null;
    return this.fileRepo.listFiles({
      workspaceId,
      driveType,
      ownerId,
      folderId: folderId ?? null,
    });
  }

  async renameFile(fileId: string, fileName: string): Promise<DriveFile> {
    return this.fileRepo.updateFile({ fileName }, fileId);
  }

  async updateFile(
    fileId: string,
    updatable: UpdatableDriveFile,
  ): Promise<DriveFile> {
    return this.fileRepo.updateFile(updatable, fileId);
  }

  async moveFile(
    fileId: string,
    targetFolderId: string | null,
  ): Promise<DriveFile> {
    return this.fileRepo.updateFile(
      { folderId: targetFolderId ?? null },
      fileId,
    );
  }

  async softDeleteFile(fileId: string): Promise<void> {
    return this.fileRepo.softDeleteFile(fileId);
  }

  async getFile(fileId: string): Promise<DriveFile> {
    return this.fileRepo.findById(fileId);
  }

  async getFolder(folderId: string): Promise<DriveFolder> {
    return this.folderRepo.findById(folderId);
  }
}
