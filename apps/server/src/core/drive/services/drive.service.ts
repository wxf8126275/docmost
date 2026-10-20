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
  spaceId: string;
  name: string;
  parentId?: string | null;
}

export interface CreateFileInput {
  spaceId: string;
  folderId?: string | null;
  fileName: string;
  filePath: string;
  fileExt: string;
  fileSize?: number | null;
  mimeType?: string | null;
  type?: string | null;
}

/**
 * Business logic for the Cloud Drive feature. Authorization (space CASL) is
 * applied at the controller layer. Every drive operation is scoped to the
 * owning `spaceId` — a drive space's folders/files are invisible and
 * unreachable from any other space.
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
    const insertable: InsertableDriveFolder = {
      workspaceId,
      spaceId: dto.spaceId,
      parentId: dto.parentId ?? null,
      name: dto.name,
      creatorId: authUser.id,
    };

    return this.folderRepo.createFolder(insertable);
  }

  async listFolders(
    authUser: User,
    workspaceId: string,
    spaceId: string,
    parentId?: string | null,
  ): Promise<DriveFolder[]> {
    return this.folderRepo.listFolders({
      workspaceId,
      spaceId,
      parentId: parentId ?? null,
    });
  }

  async renameFolder(
    spaceId: string,
    folderId: string,
    name: string,
  ): Promise<DriveFolder> {
    return this.folderRepo.updateFolder({ name }, folderId, spaceId);
  }

  async moveFolder(
    spaceId: string,
    folderId: string,
    targetParentId: string | null,
  ): Promise<DriveFolder> {
    return this.folderRepo.updateFolder(
      { parentId: targetParentId ?? null },
      folderId,
      spaceId,
    );
  }

  async softDeleteFolder(spaceId: string, folderId: string): Promise<void> {
    return this.folderRepo.softDeleteFolder(folderId, spaceId);
  }

  /** Walks the parent chain from `folderId` back to the root, inclusive. */
  async getBreadcrumb(spaceId: string, folderId: string): Promise<DriveFolder[]> {
    const crumbs: DriveFolder[] = [];
    let current = await this.folderRepo.findById(folderId, { spaceId });

    while (current) {
      crumbs.unshift(current);
      if (!current.parentId) break;
      current = await this.folderRepo.findById(current.parentId, { spaceId });
    }

    return crumbs;
  }

  // ---- Files ----

  async createFile(
    authUser: User,
    workspaceId: string,
    dto: CreateFileInput,
  ): Promise<DriveFile> {
    const insertable: InsertableDriveFile = {
      workspaceId,
      spaceId: dto.spaceId,
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
    spaceId: string,
    folderId?: string | null,
  ): Promise<DriveFile[]> {
    return this.fileRepo.listFiles({
      workspaceId,
      spaceId,
      folderId: folderId ?? null,
    });
  }

  async renameFile(
    spaceId: string,
    fileId: string,
    fileName: string,
  ): Promise<DriveFile> {
    return this.fileRepo.updateFile({ fileName }, fileId, spaceId);
  }

  async updateFile(
    spaceId: string,
    fileId: string,
    updatable: UpdatableDriveFile,
  ): Promise<DriveFile> {
    return this.fileRepo.updateFile(updatable, fileId, spaceId);
  }

  async moveFile(
    spaceId: string,
    fileId: string,
    targetFolderId: string | null,
  ): Promise<DriveFile> {
    return this.fileRepo.updateFile(
      { folderId: targetFolderId ?? null },
      fileId,
      spaceId,
    );
  }

  async softDeleteFile(spaceId: string, fileId: string): Promise<void> {
    return this.fileRepo.softDeleteFile(fileId, spaceId);
  }

  async getFile(fileId: string, spaceId?: string): Promise<DriveFile> {
    return this.fileRepo.findById(fileId, spaceId ? { spaceId } : undefined);
  }

  async getFolder(folderId: string, spaceId?: string): Promise<DriveFolder> {
    return this.folderRepo.findById(folderId, spaceId ? { spaceId } : undefined);
  }
}
